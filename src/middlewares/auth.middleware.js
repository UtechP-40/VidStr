import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import  {User}  from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const authenticate = asyncHandler(async (req, res, next) => {
    try {
        
        if (req.isAuthenticated && req.isAuthenticated()) {
            return next();
        }

        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if (!token) {
            return res.status(401).json(new ApiResponse(401, null, "Unauthorized request"))
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRATE)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401, "Invalid Access Token")
        }

       req.user = user;

        if (req.session) {
            req.login(user, { session: false }, (err) => {
                if (err) return next(err);
            });
        }

        next()
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res
                .status(401)
                .clearCookie("accessToken", options)
                .clearCookie("refreshToken", options)
                .json(new ApiResponse(401, null, "Access token expired"));
        } else {
            return res
                .status(err.statusCode || 401)
                .clearCookie("accessToken", options)
                .clearCookie("refreshToken", options)
                .json(new ApiResponse(err.statusCode || 400, null, err.message));
        }
    }
})