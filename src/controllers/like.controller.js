import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import {Tweet} from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    try {
        const {videoId} = req.params
        //TODO: toggle like on video
        const userId = req.user._id
        if(!isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video id")
        }
        const video = await Video.findById(videoId)
        if(!video) {
            throw new ApiError(404, "Video not found")
        }
        const like = await Like.findOne({videoId, userId})
        if(like) {
            await like.remove()
            return res.status(200).json(
                new ApiResponse(200, {}, "Like removed successfully")
            )
        }
        const newLike = await Like.create({videoId, userId})
        return res.status(201).json(
            new ApiResponse(201, newLike, "Like added successfully")
        )
    } catch (error) {
        res.status(500).json(new ApiResponse(500, {}, error?.message || "Something went wrong while liking the video"))
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    try {
        const {commentId} = req.params
        //TODO: toggle like on comment
        const userId = req.user._id
        if(!isValidObjectId(commentId)) {
            throw new ApiError(400, "Invalid comment id")
        }
        const comment = await Comment.findById(commentId)
        if(!comment) {
            throw new ApiError(404, "Comment not found")
        }
        const like = await Like.findOne({commentId, userId})
        if(like) {
            await like.remove()
            return res.status(200).json(
                new ApiResponse(200, {}, "Like removed successfully")
            )
        }
        const newLike = await Like.create({commentId, userId})
        return res.status(201).json(
            new ApiResponse(201, newLike, "Like added successfully")
        )
    } catch (error) {
        res.status(500).json(new ApiResponse(500, {}, error?.message || "Something went wrong while liking the comment"))
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    try {
        const {tweetId} = req.params
        //TODO: toggle like on tweet
        const userId = req.user._id
        if(!isValidObjectId(tweetId)) {
            throw new ApiError(400, "Invalid tweet id")
        }
        const tweet = await Tweet.findById(tweetId)
        if(!tweet) {
            throw new ApiError(404, "Tweet not found")
        }
        const like = await Like.findOne({tweetId, userId})
        if(like) {
            await like.remove()
            return res.status(200).json(
                new ApiResponse(200, {}, "Like removed successfully")
            )
        }
        const newLike = await Like.create({tweetId, userId})
        return res.status(201).json(
            new ApiResponse(201, newLike, "Like added successfully")
        )
    } catch (error) {
        res.status(500).json(new ApiResponse(500, {}, error?.message || "Something went wrong while liking the tweet"))
    }

}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query
        //TODO: get liked videos
        const skip = (page - 1) * limit
        const likes = await Like.find({userId: req.user._id}).sort({createdAt: -1}).skip(skip).limit(limit)
        if(!likes) {
            throw new ApiError(404, "No likes found")
        }
        const videoIds = likes.map(like => like.videoId)
        const videos = await Video.find({_id: {$in: videoIds}}).sort({createdAt: -1}).skip(skip).limit(limit)
        if(!videos) {
            throw new ApiError(404, "No videos found")
        }
        return res.status(200).json(
            new ApiResponse(200, videos, "Liked videos fetched successfully")
        )
    } catch (error) {
        res.status(500).json(new ApiResponse(500, {}, error?.message || "Something went wrong while fetching liked videos"))
    }
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}