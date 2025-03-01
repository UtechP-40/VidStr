import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import {Tweet} from "../models/tweet.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Tweet } from './../models/tweet.model';


const toggleSubscription = asyncHandler(async (req, res) => {
    try {
        const {channelId} = req.params
    // TODO: toggle subscription
    const subscriberId = req.user._id
    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id")
    }
    const subscriber = await User.findById(subscriberId)
    const channel = await User.findById(channelId)
    if(!subscriber || !channel) {
        throw new ApiError(404, "Subscriber or channel not found")
    }
    const isSubscribed = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId
    })
    if(isSubscribed) {
        await Subscription.findOneAndDelete({
            subscriber: subscriberId,
            channel: channelId
        })
        return res.status(200).json(
            new ApiResponse(200, {}, "Unsubscribed successfully")
        )
    }
    await Subscription.create({
        subscriber: subscriberId,
        channel: channelId
    })
    return res.status(200).json(
        new ApiResponse(200, {}, "Subscribed successfully")
    )
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error")
        )
    }

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    try {
        const {channelId} = req.params
        const subscribers = await Subscription.aggregate([
            {
                $match: {
                    channel: new mongoose.Types.ObjectId(channelId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "subscriber",
                    foreignField: "_id",
                    as: "subscriber"
                }
            },
            {
                $unwind: "$subscriber"
            },
            {
                $project: {
                    "_id": 0,
                    "subscriber": {
                        "_id": 1,
                        "username": 1,
                        "fullName": 1,
                        "avatar": 1
                    }
                }
            }
        ])
        return res.status(200).json(
            new ApiResponse(200, subscribers, "Subscribers fetched successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error")
        )
    }
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    try {
        const { subscriberId } = req.params
        const channels = await Subscription.aggregate([
            {
                $match: {
                    subscriber: new mongoose.Types.ObjectId(subscriberId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "channel",
                    foreignField: "_id",
                    as: "channel"
                }
            },
            {
                $unwind: "$channel"
            },
            {
                $project: {
                    "_id": 0,
                    "channel": {
                        "_id": 1,
                        "username": 1,
                        "fullName": 1,
                        "avatar": 1
                    }
                }
            }
        ])
        return res.status(200).json(
            new ApiResponse(200, channels, "Channels fetched successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error"))
    }
})
const createTweet = asyncHandler(async (req, res) => {
    try {
        const { subscriberId } = req.params
        const { content } = req.body
        if(!content) {
            throw new ApiError(400, "Content is required")
        }
        const tweet = await Tweet.create({
            content,
            owner: subscriberId
        })
        return res.status(200).json(
            new ApiResponse(200, tweet, "Tweet created successfully")
        )


    } catch (error) {
        res.status(error.statusCode || 500).json(new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error"))
    }
})
const deleteTweet = asyncHandler(async (req, res) => {
    try {
        const { subscriberId } = req.params
        const { tweetId } = req.params
        const deleteTweet = await Tweet.findByIdAndDelete(tweetId)
        return res.status(200).json(
            new ApiResponse(200, deleteTweet, "Tweet deleted successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error"))
    }
})
const getUserTweets = asyncHandler(async (req, res) => {
    try {
        const { subscriberId } = req.params
        const tweets = await Tweet.find({
            owner: subscriberId
        })
        return res.status(200).json(
            new ApiResponse(200, tweets, "Tweets fetched successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error"))
    }
})
const updateTweet = asyncHandler(async (req, res) => {
    try {
        const { subscriberId } = req.params
        const { tweetId } = req.params
        const { content } = req.body
        if(!content) {
            throw new ApiError(400, "Content is required")
        }
        const tweet = await Tweet.findByIdAndUpdate(tweetId, {
            content
        }, {
            new: true
        })
        return res.status(200).json(
            new ApiResponse(200, tweet, "Tweet updated successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error"))
    }
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels,
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
    
}