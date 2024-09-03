import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import  {ApiError}  from "../utils/ApiError.js";
// import {upload} from '../middlewares/multer.middleware.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
        // 1. Get user details from frontend
        const { username, email, fullName, password } = req.body;
        console.log(req.body);

        // // 2. Validate non-empty fields

        if ([username, email, fullName, password].some(field => !field || field.trim() === "")) {
            throw new ApiError(400, "All fields are required");
        }

        // // 3. Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            throw new ApiError(409, "User with email or username already exists");
        }

        
        // // 4. Check for images, check for avatar
        const avatarLocalPath = req.files?.avatar[0]?.path;
        const coverImageLocalPath = req.files?.coverImage[0]?.path;

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is required");
        }

        // // 5. Upload them to cloudinary, avatar
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

        if (!avatar) {
            throw new ApiError(400, "Avatar file upload failed");
        }

        // // 6. Create user object - create user in database
        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        });


        // // 7. Remove password and refresh token field from response
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        );

        // // 8. Check for user creation
        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user");
        }

        // // 9. Return response
        return res.status(201).json(
            new ApiResponse(200, createdUser, "User registered successfully")
        );
})

export { registerUser };