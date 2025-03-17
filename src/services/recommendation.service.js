import { Video } from "../models/video.model.js";
import { UserPreference } from "../models/userPreference.model.js";
import mongoose from "mongoose";

export const getRecommendedVideos = async (userId, currentVideoId, page = 1, limit = 10) => {
    try {
        const userPreference = await UserPreference.findOne({ user: userId })
            .populate('preferredCategories.category')
            .populate('preferredTags.tag');
        
        const skip = (page - 1) * limit;
        
        const baseMatch = {
            $match: {
                isPublished: true,
                visibility: "public",
                ...(currentVideoId && { _id: { $ne: new mongoose.Types.ObjectId(currentVideoId) } })
            }
        };

        let pipeline = [baseMatch];

        if (userPreference) {
            pipeline.push({
                $addFields: {
                    score: {
                        $add: [
                            // Base score
                            1,
                            // Category preference score
                            {
                                $multiply: [
                                    {
                                        $reduce: {
                                            input: userPreference.preferredCategories,
                                            initialValue: 0,
                                            in: {
                                                $cond: [
                                                    { $eq: ["$$this.category._id", "$category"] },
                                                    "$$this.weight",
                                                    "$$value"
                                                ]
                                            }
                                        }
                                    },
                                    10
                                ]
                            },
                            // Tag preference score
                            {
                                $multiply: [
                                    {
                                        $size: {
                                            $setIntersection: [
                                                "$tags",
                                                userPreference.preferredTags.map(t => t.tag._id)
                                            ]
                                        }
                                    },
                                    5
                                ]
                            },
                            // View count weight
                            { $multiply: [{ $log10: { $add: ["$views", 1] } }, 2] },
                            // Watch duration weight
                            { $multiply: [{ $ifNull: ["$averageWatchDuration", 0] }, 0.3] },
                            // Recency bonus
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            { $subtract: [new Date(), "$createdAt"] },
                                            1000 * 60 * 60 * 24 * 7 // Convert to weeks
                                        ]
                                    },
                                    -0.5 // Negative weight for older content
                                ]
                            }
                        ]
                    }
                }
            });
        } else {
            pipeline.push({
                $addFields: {
                    score: {
                        $add: [
                            { $multiply: [{ $log10: { $add: ["$views", 1] } }, 0.4] },
                            { $multiply: [{ $size: "$likes" }, 0.3] },
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            { $subtract: [new Date(), "$createdAt"] },
                                            1000 * 60 * 60 * 24
                                        ]
                                    },
                                    -0.3
                                ]
                            }
                        ]
                    }
                }
            });
        }

        pipeline.push(
            { $sort: { score: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner"
                }
            },
            { $unwind: "$owner" },
            {
                $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryData"
                }
            },
            { $unwind: "$categoryData" },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    thumbnail: 1,
                    duration: 1,
                    views: 1,
                    createdAt: 1,
                    category: "$categoryData.name",
                    score: 1,
                    "owner._id": 1,
                    "owner.username": 1,
                    "owner.avatar": 1
                }
            }
        );

        const [videos, totalCount] = await Promise.all([
            Video.aggregate(pipeline),
            Video.countDocuments(baseMatch.$match)
        ]);

        return {
            videos,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalVideos: totalCount
        };

    } catch (error) {
        console.error("Recommendation error:", error);
        throw error;
    }
};

export const getTrendingVideos = async (limit = 10) => {
    const pipeline = [
        {
            $match: {
                isPublished: true,
                visibility: "public"
            }
        },
        {
            $addFields: {
                trendingScore: {
                    $add: [
                        { $multiply: [{ $log10: { $add: ["$views", 1] } }, 0.4] },
                        { $multiply: [{ $size: "$likes" }, 0.3] },
                        { $multiply: [{ $ifNull: ["$averageWatchDuration", 0] }, 0.3] }
                    ]
                }
            }
        },
        { $sort: { trendingScore: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        { $unwind: "$owner" },
        {
            $project: {
                _id: 1,
                title: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                "owner._id": 1,
                "owner.username": 1,
                "owner.avatar": 1
            }
        }
    ];

    return Video.aggregate(pipeline);
};

export const updateUserPreferences = async (userId, videoId, action) => {
    try {
        return await UserPreference.updatePreferences(userId, videoId, action.type, action.duration);
    } catch (error) {
        console.error("Error updating user preferences:", error);
        throw error;
    }
};