import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    try {
        const {videoId} = req.params
        if(!mongoose.isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video id")
        }
        const comments = await Comment.find({video: videoId})
        if(!comments) {
            throw new ApiError(404, "Comments not found")
        }
        return res.status(200).json(
            new ApiResponse(200, comments, "Comments fetched successfully")
        )
    } catch (error) {
        res.status(500).json(
            new ApiResponse(500, {}, error?.message || "Something went wrong while fetching comments")
        )
    }

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    try {
        const {videoId} = req.params
        const {comment} = req.body
        const owner = req.user._id
        if(!mongoose.isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video id")
        }
        const newComment = await Comment.create({
            comment,
            owner,
            video: videoId
        })
        return res.status(201).json(
            new ApiResponse(201, newComment, "Comment added successfully")
        )
    } catch (error) {
        res.status(500).json(
            new ApiResponse(500, {}, error?.message || "Something went wrong while adding comment")
        )
    }
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    try {
        const {commentId} = req.params
        const {comment} = req.body
        if(!mongoose.isValidObjectId(commentId)) {
            throw new ApiError(400, "Invalid comment id")
        }
        const updatedComment = await Comment.findByIdAndUpdate(commentId, {comment}, {new: true})
        if(!updatedComment) {
            throw new ApiError(404, "Comment not found")
        }
        return res.status(200).json(
            new ApiResponse(200, updatedComment, "Comment updated successfully")
        )
    } catch (error) {
        res.status(500).json(
            new ApiResponse(500, {}, error?.message || "Something went wrong while updating comment")
        )
    }
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    try {
        const {commentId} = req.params
        if(!mongoose.isValidObjectId(commentId)) {
            throw new ApiError(400, "Invalid comment id")
        }
        const deletedComment = await Comment.findByIdAndDelete(commentId)
        if(!deletedComment) {
            throw new ApiError(404, "Comment not found")
        }
        return res.status(200).json(
            new ApiResponse(200, {}, "Comment deleted successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Something went wrong while deleting comment")
        )
    }
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }