import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    try {
        const {name, description} = req.body
        const owner = req.user._id
        const playlist = await Playlist.create({
            name,
            description,
            owner
        })
        return res.status(201).json(
            new ApiResponse(201, playlist, "Playlist created successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error")
        )
    }
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    try {
        const {page = 1, limit = 10, query, sortBy, sortType, userId} = req.query
        //TODO: get all playlists based on query, sort, pagination
        const skip = (page - 1) * limit
        const sort = {}
        sort[sortBy] = sortType
        const filter = {}
        if(query) {
            filter.$or = [
                {name: {$regex: query, $options: "i"}},
                {description: {$regex: query, $options: "i"}}
            ]
        }
        if(userId) {
            filter.owner = userId
        }
        const playlists = await Playlist.find(filter).sort(sort).skip(skip).limit(limit)
        return res.status(200).json(
            new ApiResponse(200, playlists, "Playlists fetched successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error")
        )
    }
})

const getPlaylistById = asyncHandler(async (req, res) => {
    try {
        const {playlistId} = req.params
        const playlist = await Playlist.findById(playlistId)
        if(!playlist) {
            throw new ApiError(404, "Playlist not found")
        }
        return res.status(200).json(
            new ApiResponse(200, playlist, "Playlist fetched successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error")
        )
    }
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    try {
        const {playlistId, videoId} = req.params
        const playlist = await Playlist.findById(playlistId)
        if(!playlist) {
            throw new ApiError(404, "Playlist not found")
        }
        const video = await Video.findById(videoId)
        if(!video) {
            throw new ApiError(404, "Video not found")
        }
        playlist.videos.push(video)
        await playlist.save()
        return res.status(200).json(
            new ApiResponse(200, playlist, "Video added to playlist successfully")
        )

    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error"))
    }
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    try {
        const {playlistId, videoId} = req.params
        const playlist = await Playlist.findById(playlistId)
        if(!playlist) {
            throw new ApiError(404, "Playlist not found")
        }
        const video = await Video.findById(videoId)
        if(!video) {
            throw new ApiError(404, "Video not found")
        }
        playlist.videos.pull(video)
        await playlist.save()
        return res.status(200).json(
            new ApiResponse(200, playlist, "Video removed from playlist successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error")
        )
    }

})

const deletePlaylist = asyncHandler(async (req, res) => {
    try {
        const {playlistId} = req.params
        const playlist = await Playlist.findById(playlistId)
        if(!playlist) {
            throw new ApiError(404, "Playlist not found")
        }
        await playlist.deleteOne()
        return res.status(200).json(
            new ApiResponse(200, {}, "Playlist deleted successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error")
        )
    }
})

const updatePlaylist = asyncHandler(async (req, res) => {
    try {
        const {playlistId} = req.params
        const {name, description} = req.body
        const playlist = await Playlist.findById(playlistId)
        if(!playlist) {
            throw new ApiError(404, "Playlist not found")
        }
        playlist.name = name
        playlist.description = description
        await playlist.save()
        return res.status(200).json(
            new ApiResponse(200, playlist, "Playlist updated successfully")
        )
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, {}, error?.message || "Internal Server Error")
        )
    }
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}