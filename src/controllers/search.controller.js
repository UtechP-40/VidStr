import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

const searchContent = asyncHandler(async (req, res) => {
    const { q: searchQuery } = req.query;
    
    if (!searchQuery?.trim()) {
        return res.status(200).json(
            new ApiResponse(200, {
                channels: [],
                videos: []
            }, "Empty search query")
        );
    }

    const searchRegex = new RegExp(searchQuery, 'i');

    // Search for channels (users)
    const channels = await User.find({
        username: searchRegex,
        // isVerified: true
    })
    .select('username avatar fullName subscribersCount');

    // Search for videos with different priorities
    const [exactTitleMatch, tagMatch, categoryMatch] = await Promise.all([
        // Priority 1: Exact title matches
        Video.find({
            title: searchRegex,
            isPublished: true
        })
        .populate('owner', 'username avatar')
        .populate('category', 'name')
        .sort('-views'),

        // Priority 2: Tag matches
        Video.aggregate([
            {
                $lookup: {
                    from: 'tags',
                    localField: 'tags',
                    foreignField: '_id',
                    as: 'tagsData'
                }
            },
            {
                $match: {
                    isPublished: true,
                    $or: [
                        { 'tagsData.name': searchRegex },
                        { 'category.name': searchRegex }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'owner',
                    foreignField: '_id',
                    as: 'owner'
                }
            },
            { $unwind: '$owner' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            { $sort: { views: -1 } }
        ]),

        // Priority 3: Category matches
        Video.find({
            'category.name': searchRegex,
            isPublished: true,
            title: { $not: searchRegex }
        })
        .populate('owner', 'username avatar')
        .populate('category', 'name')
        .sort('-views')
    ]);

    // Combine results maintaining priority order
    const videos = [
        ...exactTitleMatch,
        ...tagMatch,
        ...categoryMatch
    ];

    return res.status(200).json(
        new ApiResponse(200, {
            channels: channels.length > 0 ? channels : null,
            videos: videos.length > 0 ? videos : null
        }, "Search results fetched successfully")
    );
});

export { searchContent };