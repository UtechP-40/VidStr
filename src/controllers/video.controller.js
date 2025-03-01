import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
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
    const videos = await Video.find(filter).sort(sort).skip(skip).limit(limit)
    const totalVideos = await Video.countDocuments(filter)
    return res.status(200).json(
        new ApiResponse(200, {videos, totalVideos}, "Videos fetched successfully")
    )

    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error")
        )
    }
})

const publishAVideo = asyncHandler(async (req, res) => {
    try {
        const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    const videoLocalPath = req.files?.videoFile[0]?.path
    if(!videoLocalPath) {
        throw new ApiError(400, "Video file is required")
    }
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path
    if(!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is required")
    }
    const video = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!video) {
        throw new ApiError(500, "Something went wrong while uploading video")
    }
    if(!thumbnail) {
        throw new ApiError(500, "Something went wrong while uploading thumbnail")
    }
    const videoFile = {
        url: video.url,
        secure_url: video.secure_url
    }
    const thumbnailFile = {
        url: thumbnail.url,
        secure_url: thumbnail.secure_url
    }
    const videoData = await Video.create({
        title,
        description,
        videoFile,
        thumbnail: thumbnailFile,
        owner: req.user._id
    })
    return res.status(201).json(
        new ApiResponse(201, videoData, "Video published successfully")
    )
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error")
        )
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
    //TODO: get video by id
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(404, "Video not found")
    }
    return res.status(200).json(
        new ApiResponse(200, video, "Video fetched successfully")
    )
    } catch (error) {
     req.status(error.statusCode || 500).json(
        new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error"))   
    }
})

const updateVideo = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        //TODO: update video details like title, description, thumbnail
        const { title, description } = req.body
        const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

        if(!isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video id")
        }
        const video = await Video.findById(videoId)
        if(!video) {
            throw new ApiError(404, "Video not found")
        }

        if(title) {
            video.title = title
        }
        if(description) {
            video.description = description
        }

        if(thumbnailLocalPath) {
            const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
            if(!thumbnail) {
                throw new ApiError(500, "Something went wrong while uploading thumbnail")
            }
            video.thumbnail = {
                url: thumbnail.url,
                secure_url: thumbnail.secure_url
            }
        }

        await video.save()
        return res.status(200).json(
            new ApiResponse(200, video, "Video updated successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error"))
    }

})

const deleteVideo = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
    //TODO: delete video
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(404, "Video not found")
    }
    await video.deleteOne()
    return res.status(200).json(
        new ApiResponse(200, {}, "Video deleted successfully")
    )
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error"))
    }
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
    //TODO: toggle publish status
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(404, "Video not found")
    }
    video.isPublished = !video.isPublished
    await video.save()
    return res.status(200).json(
        new ApiResponse(200, video, "Video published status toggled successfully")
    )
    } catch (error) {
     res.status(error.statusCode || 500).json(new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error"))  
    }
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}