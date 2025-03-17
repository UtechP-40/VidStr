import { Router } from "express";
import { 
    loginUser, 
    logoutUser, 
    registerUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateUserAvatar, 
    updateUserCoverImage, 
    getUserChannelProfile, 
    getWatchHistory, 
    updateAccountDetails
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middlewares.js"
import { authenticate } from "../middlewares/auth.middleware.js";


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(authenticate,  logoutUser)
router.route("/refresh-token").patch(refreshAccessToken)
router.route("/change-password").post(authenticate, changeCurrentPassword)
router.route("/current-user").get(authenticate, getCurrentUser)
router.route("/update-account").patch(authenticate, updateAccountDetails)

router.route("/avatar").patch(authenticate, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(authenticate, upload.single("coverImage"), updateUserCoverImage)

router.route("/c/:username").get(authenticate, getUserChannelProfile)
router.route("/history").get(authenticate, getWatchHistory)

export default router