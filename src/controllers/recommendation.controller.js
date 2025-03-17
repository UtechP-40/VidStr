import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { getRecommendedVideos, getTrendingVideos, updateUserPreferences } from "../services/recommendation.service.js";
import { Video } from "../models/video.model.js";
import { UserPreference } from "../models/userPreference.model.js";
import { isValidObjectId } from "mongoose";
import mongoose from "mongoose"
const getRecommendations = asyncHandler(async (req, res) => {
    const { limit = 20, page = 1, category, currentVideoId } = req.query;
    const userId = req.user?._id;

    // Get user preferences
    const userPreference = await UserPreference.findOne({ user: userId })
        .populate('preferredCategories.category')
        .populate('preferredTags.tag');

    const pipeline = [
        {
            $match: {
                isPublished: true,
                ...(currentVideoId && isValidObjectId(currentVideoId) && { 
                    _id: { $ne: new mongoose.Types.ObjectId(currentVideoId) } 
                }),
                ...(category && isValidObjectId(category) && { 
                    category: new mongoose.Types.ObjectId(category) 
                }),
                ...(userPreference?.watchHistory?.length > 0 && {
                    _id: { 
                        $nin: userPreference.watchHistory.map(h => h.video)
                    }
                })
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: 'category',
                foreignField: '_id',
                as: 'categoryData'
            }
        },
        {
            $lookup: {
                from: 'tags',
                localField: 'tags',
                foreignField: '_id',
                as: 'tagsData'
            }
        },
        {
            $addFields: {
                score: {
                    $add: [
                        // Base score
                        1,
                        // Category preference score
                        {
                            $multiply: [
                                {
                                    $first: {
                                        $map: {
                                            input: userPreference?.preferredCategories || [],
                                            as: "pc",
                                            in: {
                                                $cond: [
                                                    { $eq: ["$$pc.category", "$category"] },
                                                    "$$pc.weight",
                                                    0
                                                ]
                                            }
                                        }
                                    }
                                },
                                10
                            ]
                        },
                        // Tags preference score
                        {
                            $multiply: [
                                {
                                    $size: {
                                        $setIntersection: [
                                            "$tags",
                                            userPreference?.preferredTags?.map(t => t.tag) || []
                                        ]
                                    }
                                },
                                5
                            ]
                        },
                        // Popularity score
                        { $multiply: [{ $log10: { $add: ["$views", 1] } }, 2] }
                    ]
                }
            }
        },
        { $sort: { score: -1, createdAt: -1 } },
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner'
            }
        },
        { $unwind: '$owner' }
    ];

    const matchQuery = { 
        isPublished: true,
        ...(category && isValidObjectId(category) && { 
            category: new mongoose.Types.ObjectId(category) 
        })
    };
    if (category) {
        matchQuery.category = new mongoose.Types.ObjectId(category);
    }

    const [videos, totalCount] = await Promise.all([
        Video.aggregate(pipeline),
        Video.countDocuments(matchQuery)
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            videos,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalVideos: totalCount
        }, "Recommendations fetched successfully")
    );
});

const trackUserAction = asyncHandler(async (req, res) => {
    const { videoId, action } = req.body;
    const userId = req.user._id;

    await updateUserPreferences(userId, videoId, action);

    return res.status(200).json(
        new ApiResponse(200, {}, "User preference updated successfully")
    );
});

const getTrendingVideo = asyncHandler(async (req, res) => {
    const { limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const trendingVideos = await getTrendingVideos({
        limit: parseInt(limit),
        skip
    });

    const totalVideos = trendingVideos.metadata[0]?.total || 0;
    const totalPages = Math.ceil(totalVideos / parseInt(limit));

    return res.status(200).json(
        new ApiResponse(200, {
            videos: trendingVideos.videos,
            currentPage: parseInt(page),
            totalPages,
            totalVideos
        }, "Trending videos fetched successfully")
    );
});

export {
    getRecommendations,
    trackUserAction,
    getTrendingVideo
};