import { Router } from 'express';
import {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    toggleVideoLike,
    toggleVideoDislike

} from "../controllers/video.controller.js"
import {authenticate} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middlewares.js"

const router = Router();
// router.use(); // Apply verifyJWT middleware to all routes in this file

router
    .route("/")
    .get(getAllVideos)
    .post(authenticate,
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },
            
        ]),
        publishAVideo
    );

router
    .route("/:videoId")
    .get(getVideoById)
    .delete(authenticate,deleteVideo)
    .patch(authenticate,upload.single("thumbnail"), updateVideo);

router.route("/toggle/publish/:videoId").patch(authenticate,togglePublishStatus);
router.route("/:videoId/like")
    .post(toggleVideoLike);

router.route("/:videoId/dislike")
    .post(toggleVideoDislike);

export default router