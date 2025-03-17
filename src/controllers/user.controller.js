import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import  {ApiError}  from "../utils/ApiError.js";
// import {upload} from '../middlewares/multer.middleware.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs"
import dotenv from "dotenv"
import jwt from "jsonwebtoken"
dotenv.config()
// const generateAccessAndRefreshTokens = async (userId)=>{
//     try{
//         const user = await User.findById(userId)
//        const accessToken =  user.generateAccessToken()
//        const refreshToken = user.generateRefreshToken()

//        user.refreshToken = refreshToken
//        await user.save({validateBeforeSave:false})
//        return {accessToken,refreshToken}
//     }catch(error){
//         throw new ApiError(500, "Somthing went wrong while generating refresh and access token")
//     }
// }

const registerUser = asyncHandler(async (req, res) => {
        // 1. Get user details from frontend
        const {fullName, email, username, password } = req.body
    //console.log("email: ", email);
    console.log(req.body)
    if (
        [fullName || "", email || "", username || "", password || ""].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
console.log(existedUser)
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })
    // const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user?._id)
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
        
})

const loginUser = asyncHandler(async (req, res, next) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            throw new ApiError(400, "Email and Password are required");
        }

        const user = await User.findOne({ email });
        if (!user) {
            throw new ApiError(404, "User does not exist");
        }

        const isPasswordValid = await user.isPasswordCorrect(password);
        if (!isPasswordValid) {
            throw new ApiError(401, "Incorrect password");
        }

        // Generate tokens using user methods
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Update user's refresh token
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // Remove sensitive information
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

        const options = {
            httpOnly: true,
            secure: true
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(
                200, 
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            ));
    } catch (error) {
        console.log(error)
        next(error)
    }
})

const logoutUser = asyncHandler(async (req, res, next) => {
    try {
        

        if (req.logout) {
            req.logout(function (err) {
                if (err) return next(err);
            });
        }


        await RefreshToken.findOneAndDelete({ user: req.user?._id })

        const options = {
            httpOnly: true,
            secure: true
        }

        
        return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
            new ApiResponse(200, {}, "User Logged Out Successfully")
        )
    } catch (error) {
        next(error)
    }
})

const refreshAccessToken = asyncHandler(async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken

        // Check if refresh token is provided
        if (!refreshToken) {
            throw new ApiError(400, "Refresh Token required");
        }

        // Find refresh token and populate user
        const foundRefreshToken = await RefreshToken.findOne({ refresh: refreshToken }).populate("user");
        if (!foundRefreshToken) {
            throw new ApiError(404, "Wrong Refresh Token");
        }

        const { user } = foundRefreshToken;

        // Generate new access token
        const accessToken = jwt.sign(
            {
                _id: user._id,
                email: user.email,
                name: user.name,
            },
            process.env.ACCESS_TOKEN_SECRATE,
            {
                expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
            }
        );

        const options = {
            httpOnly: true,
            secure: true,
        };

        // Set cookies and send response
        res
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(200, { user, accessToken, refreshToken }, "User logged in successfully"));
    } catch (error) {
        // next(error);
        res.status(error.statusCode || 500).json(new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error"));
    }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})


const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})


const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos",
                pipeline: [
                    {
                        $match: {
                            isPublished: true // Only get published videos
                        }
                    },
                    {
                        $project: {
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1,
                            thumbnail: 1,
                            videoFile: 1,
                            createdAt: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                videos: 1,
                videosCount: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}

// export { registerUser,loginUser,logoutUser,refreshAccessToken};