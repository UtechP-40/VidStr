import { Router } from 'express';
import {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment,
    toggleCommentLike,
    toggleCommentDislike
} from "../controllers/comment.controller.js"
import { authenticate } from "../middlewares/auth.middleware.js"

const router = Router();

// Video comments routes
router.route("/:videoId")
    .get(getVideoComments)
    .post(authenticate, addComment);

// Comment management routes
router.route("/:commentId")
    .patch(authenticate, updateComment)
    .delete(authenticate, deleteComment);

// Comment interaction routes
router.route("/:commentId/like")
    .post(authenticate, toggleCommentLike);

router.route("/:commentId/dislike")
    .post(authenticate, toggleCommentDislike);

export default router