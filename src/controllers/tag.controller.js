import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tag } from "../models/tag.model.js";

const getAllTags = asyncHandler(async (req, res) => {
    const tags = await Tag.find()
        .sort({ usageCount: -1 })
        .select("name usageCount");

    return res.status(200).json(
        new ApiResponse(200, tags, "Tags fetched successfully")
    );
});

const createTag = asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name?.trim()) {
        throw new ApiError(400, "Tag name is required");
    }

    const existingTag = await Tag.findOne({ name: name.toLowerCase() });
    if (existingTag) {
        return res.status(200).json(
            new ApiResponse(200, existingTag, "Tag already exists")
        );
    }

    const tag = await Tag.create({
        name: name.toLowerCase(),
        createdBy: req.user._id
    });

    return res.status(201).json(
        new ApiResponse(201, tag, "Tag created successfully")
    );
});

export {
    getAllTags,
    createTag
};