import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {Notification} from "../models/notification.model.js"
import {VideoInteraction} from "../models/videoInteraction.model.js"
import {VideoDislike} from "../models/videoDislike.model.js"
import {Category} from "../models/category.model.js"
import {Tag} from "../models/tag.model.js"
// import {VideoInteraction} from "../models/videoInteraction.model.js"
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    const skip = (page - 1) * limit
    const sort = {}
    sort[sortBy] = sortType
    const filter = {}

    if(query) {
        filter.$or = [
            {title: {$regex: query, $options: "i"}},
            {description: {$regex: query, $options: "i"}}
        ]
    }

    if(userId) {
        filter.owner = new mongoose.Types.ObjectId(userId)
    }

    const videos = await Video.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("owner", "username avatar")
        .lean()

    // Get interaction counts for each video
    const videosWithInteractions = await Promise.all(videos.map(async (video) => {
        const [likes, dislikes] = await Promise.all([
            VideoInteraction.countDocuments({ videoId: video._id, type: 'LIKE' }),
            VideoDislike.countDocuments({ videoId: video._id })
        ])

        return {
            ...video,
            likeCount: likes,
            dislikeCount: dislikes
        }
    }))

    const totalVideos = await Video.countDocuments(filter)
    
    return res.status(200).json(
        new ApiResponse(200, {videos: videosWithInteractions, totalVideos}, "Videos fetched successfully")
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description, categoryId, tags = [] } = req.body;

    if (!title?.trim() || !description?.trim() || !categoryId) {
        throw new ApiError(400, "Title, description and category are required");
    }

    // Validate category
    const category = await Category.findById(categoryId);
    if (!category || !category.isActive) {
        throw new ApiError(400, "Invalid or inactive category");
    }

    // Process and validate tags
    let processedTags = [];
    if (tags.length > 0) {
        processedTags = await Tag.findOrCreateTags(
            tags.slice(0, 10).map(tag => tag.trim()) // Limit to 10 tags
        );
    }

    // Upload video and thumbnail
    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "Video file and thumbnail are required");
    }

    // Upload to cloudinary
    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile || !thumbnail) {
        throw new ApiError(500, "Error while uploading video or thumbnail");
    }

    // Create video document
    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile.duration,
        owner: req.user._id,
        category: categoryId,
        tags: processedTags
    });

    // Update category video count
    await Category.findByIdAndUpdate(categoryId, {
        $inc: { videoCount: 1 }
    });

    // Update tag usage counts
    if (processedTags.length > 0) {
        await Tag.updateMany(
            { _id: { $in: processedTags } },
            { $inc: { usageCount: 1 } }
        );
    }

    // Create video interaction for upload
    await VideoInteraction.create({
        user: req.user._id,
        video: video._id,
        type: 'CREATE'
    });

    // Get populated video data
    const populatedVideo = await Video.findById(video._id)
        .populate('owner', 'username avatar')
        .populate('category', 'name')
        .populate('tags', 'name');

    return res.status(201).json(
        new ApiResponse(201, populatedVideo, "Video uploaded successfully")
    );
}); 

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user?._id

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    let video = await Video.findById(videoId)
        .populate("owner", "username avatar")
        .lean()

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // Fix: Update query parameters to match schema
    const [likeCount, dislikeCount, userInteraction, userDislike] = await Promise.all([
        VideoInteraction.countDocuments({ 
            video: video._id,  // Changed from videoId to video
            type: 'LIKE' 
        }),
        VideoDislike.countDocuments({ 
            video: video._id   // Changed from videoId to video
        }),
        userId ? VideoInteraction.findOne({ 
            user: userId,      // Changed from userId to user
            video: video._id,  // Changed from videoId to video
            type: 'LIKE'
        }) : null,
        userId ? VideoDislike.findOne({ 
            user: userId,      // Changed from userId to user
            video: video._id   // Changed from videoId to video
        }) : null
    ])

    // Enhance video object with interaction data
    video = {
        ...video,
        likeCount,
        dislikeCount,
        isLiked: !!userInteraction,
        isDisliked: !!userDislike,
        interactionMetrics: {
            totalInteractions: likeCount + dislikeCount,
            likeRatio: likeCount / (likeCount + dislikeCount) || 0
        }
    }

    // Update view count and history if user is logged in
    if (userId) {
        await Promise.all([
            // Update video stats
            Video.findByIdAndUpdate(videoId, { 
                $inc: { views: 1 },
                $addToSet: { uniqueViewers: userId }
            }),
            // Update user's watch history
            User.findByIdAndUpdate(userId, {
                $push: {
                    watchHistory: {
                        $each: [videoId],
                        $position: 0  // Add to start of array
                    }
                }
            })
        ]);
    }

    return res.status(200).json(
        new ApiResponse(200, video, "Video fetched successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description, category, visibility } = req.body
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(404, "Video not found")
    }

    if(title) video.title = title
    if(description) video.description = description
    if(category) video.category = category
    if(visibility) video.visibility = visibility

    if(thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if(!thumbnail) {
            throw new ApiError(500, "Error uploading thumbnail")
        }
        video.thumbnail = thumbnail.url
    }

    await video.save()

    await Notification.create({
        recipient: video.owner,
        type: "VIDEO",
        content: `Your video "${video.title}" has been updated`,
        onModel: "Video",
        relatedItem: video._id
    })

    return res.status(200).json(
        new ApiResponse(200, video, "Video updated successfully")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(404, "Video not found")
    }

    // Delete all related interactions
    await Promise.all([
        VideoInteraction.deleteMany({ videoId }),
        VideoDislike.deleteMany({ videoId })
    ])

    await Notification.create({
        recipient: video.owner,
        type: "VIDEO",
        content: `Your video "${video.title}" has been deleted`,
        onModel: "Video",
        relatedItem: video._id
    })

    await video.deleteOne()
    
    return res.status(200).json(
        new ApiResponse(200, null, "Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(404, "Video not found")
    }

    video.isPublished = !video.isPublished

    await Notification.create({
        recipient: video.owner,
        type: "VIDEO",
        content: `Your video "${video.title}" has been ${video.isPublished ? 'published' : 'unpublished'}`,
        onModel: "Video",
        relatedItem: video._id
    })

    await video.save()

    return res.status(200).json(
        new ApiResponse(200, video, "Video publish status toggled successfully")
    )
})

// const toggleVideoLike = asyncHandler(async (req, res) => {
//     const { videoId } = req.params
//     const userId = req.user._id

//     if(!isValidObjectId(videoId)) {
//         throw new ApiError(400, "Invalid video id")
//     }

//     const video = await Video.findById(videoId)
//     if(!video) {
//         throw new ApiError(404, "Video not found")
//     }

//     const [existingLike, existingDislike] = await Promise.all([
//         VideoInteraction.findOne({ userId, videoId }),
//         VideoDislike.findOne({ userId, videoId })
//     ])

//     if (existingLike) {
//         await existingLike.deleteOne()
//     } else {
//         if (existingDislike) {
//             await existingDislike.deleteOne()
//         }
        
//         await VideoInteraction.create({
//             userId,
//             videoId,
//             type: 'LIKE'
//         })

//         // Updated notification creation
//         await Notification.create({
//             recipient: video.owner,
//             type: "LIKE",
//             content: `${req.user.username} liked your video "${video.title}"`,
//             onModel: "Video",
//             relatedItem: video._id
//         })
//     }

//     const [likes, dislikes] = await Promise.all([
//         VideoInteraction.countDocuments({ videoId, type: 'LIKE' }),
//         VideoDislike.countDocuments({ videoId })
//     ])

//     return res.status(200).json(
//         new ApiResponse(200, {
//             likeCount: likes,
//             dislikeCount: dislikes
//         }, "Video interaction updated successfully")
//     )
// })

// const toggleVideoDislike = asyncHandler(async (req, res) => {
//     const { videoId } = req.params
//     const userId = req.user._id

//     if(!isValidObjectId(videoId)) {
//         throw new ApiError(400, "Invalid video id")
//     }

//     const video = await Video.findById(videoId)
//     if(!video) {
//         throw new ApiError(404, "Video not found")
//     }

//     const [existingLike, existingDislike] = await Promise.all([
//         VideoInteraction.findOne({ userId, videoId }),
//         VideoDislike.findOne({ userId, videoId })
//     ])

//     if (existingDislike) {
//         await existingDislike.deleteOne()
//     } else {
//         if (existingLike) {
//             await existingLike.deleteOne()
//         }
        
//         await VideoDislike.create({
//             userId,
//             videoId
//         })
//     }

//     const [likes, dislikes] = await Promise.all([
//         VideoInteraction.countDocuments({ videoId, type: 'LIKE' }),
//         VideoDislike.countDocuments({ videoId })
//     ])

//     return res.status(200).json(
//         new ApiResponse(200, {
//             likeCount: likes,
//             dislikeCount: dislikes
//         }, "Video interaction updated successfully")
//     )
// })

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user._id

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(404, "Video not found")
    }

    const [existingLike, existingDislike] = await Promise.all([
        VideoInteraction.findOne({ user: userId, video: videoId }),
        VideoDislike.findOne({ userId, videoId })
    ])

    // Update user preferences based on like action
    const user = await User.findById(userId)
    
    if (existingLike) {
        await existingLike.deleteOne()
        // Remove category and tags from user preferences when unliking
        if (user.preferences) {
            user.preferences.categories = user.preferences.categories.filter(cat => cat !== video.category)
            user.preferences.tags = user.preferences.tags.filter(tag => !video.tags.includes(tag))
            await user.save()
        }
    } else {
        if (existingDislike) {
            await existingDislike.deleteOne()
        }
        
        await VideoInteraction.create({
            user: userId,
            video: videoId,
            type: 'LIKE'
        })

        // Update user preferences when liking
        if (!user.preferences) {
            user.preferences = { categories: [], tags: [] }
        }
        if (!user.preferences.categories.includes(video.category)) {
            user.preferences.categories.push(video.category)
        }
        video.tags.forEach(tag => {
            if (!user.preferences.tags.includes(tag)) {
                user.preferences.tags.push(tag)
            }
        })
        await user.save()

        await Notification.create({
            recipient: video.owner,
            type: "LIKE",
            content: `${req.user.username} liked your video "${video.title}"`,
            onModel: "Video",
            relatedItem: video._id
        })
    }

    const [likes, dislikes] = await Promise.all([
        VideoInteraction.countDocuments({ video: videoId, type: 'LIKE' }),
        VideoDislike.countDocuments({ videoId })
    ])

    return res.status(200).json(
        new ApiResponse(200, {
            likeCount: likes,
            dislikeCount: dislikes
        }, "Video interaction updated successfully")
    )
})


const toggleVideoDislike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Find existing dislike
    const existingDislike = await VideoDislike.findOne({
        videoId,
        userId
    });

    // Find and remove any existing like
    await VideoInteraction.findOneAndDelete({
        videoId,
        userId,
        type: 'LIKE'
    });

    let dislike;
    if (existingDislike) {
        // Remove dislike if it exists
        await VideoDislike.findByIdAndDelete(existingDislike._id);
    } else {
        // Create new dislike
        dislike = await VideoDislike.create({
            videoId,
            userId
        });
    }

    // Get updated counts
    const [likeCount, dislikeCount] = await Promise.all([
        VideoInteraction.countDocuments({ videoId, type: 'LIKE' }),
        VideoDislike.countDocuments({ videoId })
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            likeCount,
            dislikeCount,
            isLiked: false,
            isDisliked: !existingDislike
        }, "Video dislike status updated")
    );
});

// const getRecommendedVideos = asyncHandler(async (req, res) => {
//     const { limit = 20, page = 1 } = req.query;
//     const parsedLimit = parseInt(limit);
//     const parsedPage = parseInt(page);
//     const skip = (parsedPage - 1) * parsedLimit;

//     const pipeline = [
//         { $match: { isPublished: true } },
//         {
//             $facet: {
//                 metadata: [{ $count: "total" }],
//                 videos: [
//                     { $skip: skip },
//                     { $limit: parsedLimit },
//                     {
//                         $lookup: {
//                             from: "users",
//                             localField: "owner",
//                             foreignField: "_id",
//                             as: "owner"
//                         }
//                     },
//                     { $unwind: "$owner" },
//                     {
//                         $project: {
//                             _id: 1,
//                             title: 1,
//                             description: 1,
//                             thumbnail: 1,
//                             duration: 1,
//                             views: 1,
//                             createdAt: 1,
//                             "owner._id": 1,
//                             "owner.username": 1,
//                             "owner.avatar": 1
//                         }
//                     }
//                 ]
//             }
//         }
//     ];

//     const [result] = await Video.aggregate(pipeline);
//     const totalVideos = result.metadata[0]?.total || 0;
//     const totalPages = Math.ceil(totalVideos / parsedLimit);

//     return res.status(200).json(
//         new ApiResponse(200, {
//             videos: result.videos,
//             currentPage: parsedPage,
//             totalPages,
//             totalVideos
//         }, "Recommendations fetched successfully")
//     );
// });

const updateVideoProgress = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { duration } = req.body;
    const userId = req.user._id;

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Update view history
    await Video.findByIdAndUpdate(
        videoId,
        {
            $push: {
                viewHistory: {
                    userId,
                    watchDuration: duration,
                    lastWatched: new Date()
                }
            },
            $inc: {
                totalWatchTime: duration
            }
        }
    );

    // Update average watch duration
    const updatedVideo = await Video.findById(videoId);
    const avgDuration = updatedVideo.totalWatchTime / updatedVideo.viewHistory.length;
    await Video.findByIdAndUpdate(videoId, {
        $set: { averageWatchDuration: avgDuration }
    });

    return res.status(200).json(
        new ApiResponse(200, {}, "Video progress updated successfully")
    );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    toggleVideoLike,
    toggleVideoDislike
}