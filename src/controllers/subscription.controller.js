import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


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
    const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId
    })
    if(existingSubscription) {
        await existingSubscription.deleteOne()
        channel.subscribersCount -= 1
        subscriber.subscribedChannelsCount -= 1
        await Promise.all([channel.save(), subscriber.save()])
        return res.status(200).json(
            new ApiResponse(200, {}, "Subscription removed successfully")
        )
    }
    const newSubscription = await Subscription.create({
        subscriber: subscriberId,
        channel: channelId
    })
    channel.subscribersCount += 1
    subscriber.subscribedChannelsCount += 1
    await Promise.all([channel.save(), subscriber.save(), newSubscription.save()])
    return res.status(200).json(
        new ApiResponse(200, {}, "Subscription added successfully")
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
        const {page = 1, limit = 10} = req.query
        if(!isValidObjectId(channelId)) {
            throw new ApiError(400, "Invalid channel id")
        }
        const skip = (page - 1) * limit
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
                    _id: 0,
                    subscriber: {
                        _id: 1,
                        username: 1,
                        fullName: 1,
                        profilePic: 1
                    }
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
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
        const { page = 1, limit = 10 } = req.query
        if(!isValidObjectId(subscriberId)) {
            throw new ApiError(400, "Invalid subscriber id")
        }
        const skip = (page - 1) * limit
        const subscribedChannels = await Subscription.aggregate([
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
                    _id: 0,
                    channel: {
                        _id: 1,
                        username: 1,
                        fullName: 1,
                        profilePic: 1
                    }
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ])
        return res.status(200).json(
            new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error"))
    }
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}