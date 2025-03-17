import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { createNotification } from "./notification.controller.js"
import { Video } from "../models/video.model.js"
import { Like } from "../models/like.model.js"
import { Dislike } from "../models/dislike.model.js"

// Update the getVideoComments aggregation pipeline
const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const userId = req.user?._id

    console.log("Raw videoId:", videoId, "Type:", typeof videoId)
    console.log("Raw params:", req.params)
    
    if (!videoId) { 
        throw new ApiError(400, "Video ID is required")
    }

    // Extract the actual ID if it's an object with an id property
    const actualVideoId = videoId?.id || videoId

    // Clean and validate the ID
    const cleanVideoId = String(actualVideoId).trim()
    
    console.log("Processed videoId:", cleanVideoId)
    
    if(!mongoose.isValidObjectId(cleanVideoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    
    const comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(cleanVideoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                let: { commentId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$likeableId", "$$commentId"] },
                                    { $eq: ["$likeableType", "Comment"] }
                                ]
                            }
                        }
                    }
                ],
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "dislikes",
                let: { commentId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$likeableId", "$$commentId"] },
                                    { $eq: ["$likeableType", "Comment"] }
                                ]
                            }
                        }
                    }
                ],
                as: "dislikes"
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
                likesCount: { $size: "$likes" },
                isLiked: {
                    $cond: {
                        if: { $eq: [userId, null] },
                        then: false,
                        else: {
                            $in: [
                                new mongoose.Types.ObjectId(userId),
                                "$likes.user"
                            ]
                        }
                    }
                },
                isDisliked: {
                    $cond: {
                        if: { $eq: [userId, null] },
                        then: false,
                        else: {
                            $in: [
                                new mongoose.Types.ObjectId(userId),
                                "$dislikes.user"
                            ]
                        }
                    }
                }
            }
        }
    ])

    if(!comments?.length) {
        throw new ApiError(404, "Comments not found")
    }

    return res.status(200).json(
        new ApiResponse(200, comments, "Comments fetched successfully")
    )
})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body
    const owner = req.user._id

    if(!content?.trim()) {
        throw new ApiError(400, "Comment content is required")
    }

    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const comment = await Comment.create({
        content,
        video: new mongoose.Types.ObjectId(videoId),
        owner
    })

    await Video.findByIdAndUpdate(videoId, {
        $inc: { commentsCount: 1 }
    })

    const newComment = await Comment.aggregate([
        {
            $match: {
                _id: comment._id
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
                likesCount: 0,
                isLiked: false,
                isDisliked: false
            }
        }
    ])

    if (video.owner.toString() !== owner.toString()) {
        await createNotification(
            video.owner,
            "COMMENT",
            `${req.user.fullName} commented on your video: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
            videoId,
            "Video"
        )
    }

    return res.status(201).json(
        new ApiResponse(201, newComment[0], "Comment added successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body
    const userId = req.user._id

    if(!content?.trim()) {
        throw new ApiError(400, "Comment content is required")
    }

    if(!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const comment = await Comment.findById(commentId)
    if(!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if(comment.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        {new: true}
    ).populate("owner", "username fullName avatar")

    const [likes, dislikes] = await Promise.all([
        Like.find({ likeableId: commentId, likeableType: "Comment" }),
        Dislike.find({ likeableId: commentId, likeableType: "Comment" })
    ])

    const isLiked = likes.some(like => like.user.toString() === userId.toString())
    const isDisliked = dislikes.some(dislike => dislike.user.toString() === userId.toString())

    const commentObj = updatedComment.toObject()
    commentObj.likesCount = likes.length
    commentObj.isLiked = isLiked
    commentObj.isDisliked = isDisliked

    return res.status(200).json(
        new ApiResponse(200, commentObj, "Comment updated successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if(!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const comment = await Comment.findById(commentId)
    if(!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if(comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment")
    }

    await Promise.all([
        Comment.findByIdAndDelete(commentId),
        Like.deleteMany({ likeableId: commentId, likeableType: "Comment" }),
        Dislike.deleteMany({ likeableId: commentId, likeableType: "Comment" }),
        Video.findByIdAndUpdate(comment.video, {
            $inc: { commentsCount: -1 }
        })
    ])

    return res.status(200).json(
        new ApiResponse(200, {}, "Comment deleted successfully")
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Remove dislike if exists
    await Dislike.findOneAndDelete({
        user: userId,
        likeableId: commentId,
        likeableType: 'Comment'
    });

    // Check if user has already liked
    const existingLike = await Like.findOne({
        user: userId,
        likeableId: commentId,
        likeableType: 'Comment'
    });

    if (existingLike) {
        await existingLike.deleteOne();
    } else {
        await Like.create({
            user: userId,
            likeableId: commentId,
            likeableType: 'Comment'
        });
    }

    // Get updated counts
    const likesCount = await Like.countDocuments({ 
        likeableId: commentId, 
        likeableType: 'Comment' 
    });

    return res.status(200).json(
        new ApiResponse(200, {
            likesCount,
            isLiked: !existingLike,
            isDisliked: false
        }, "Comment like toggled successfully")
    );
});

const toggleCommentDislike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    try {
        // Remove any existing like
        await Like.findOneAndDelete({
            userId: userId,
            contentId: commentId,
            contentType: "Comment"
        });

        // Find existing dislike
        const existingDislike = await Dislike.findOne({
            userId: userId,
            contentId: commentId,
            contentType: "Comment"
        });

        if (existingDislike) {
            await existingDislike.deleteOne();
        } else {
            await Dislike.create({
                userId: userId,
                contentId: commentId,
                contentType: "Comment"
            });
        }

        // Get updated counts
        const [likesCount, dislikesCount] = await Promise.all([
            Like.countDocuments({ 
                contentId: commentId, 
                contentType: "Comment" 
            }),
            Dislike.countDocuments({ 
                contentId: commentId, 
                contentType: "Comment" 
            })
        ]);

        return res.status(200).json(
            new ApiResponse(200, {
                commentId,
                likesCount,
                dislikesCount,
                isLiked: false,
                isDisliked: !existingDislike
            }, "Comment dislike toggled successfully")
        );
    } catch (error) {
        console.error("Toggle dislike error:", error);
        throw new ApiError(500, "Error toggling dislike");
    }
});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment,
    toggleCommentLike,
    toggleCommentDislike
}
