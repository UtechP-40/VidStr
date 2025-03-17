import { ApiError } from "../utils/ApiError.js";

export const validateVideo = (req, res, next) => {
    const { title, description, category } = req.body;
    const errors = [];

    if (!title?.trim()) errors.push("Title is required");
    if (!description?.trim()) errors.push("Description is required");
    if (!category?.trim()) errors.push("Category is required");
    
    if (errors.length > 0) {
        throw new ApiError(400, "Validation failed", errors);
    }
    
    next();
};

export const validateTags = (req, res, next) => {
    const { tags } = req.body;
    
    if (!Array.isArray(tags)) {
        throw new ApiError(400, "Tags must be an array");
    }
    
    if (tags.length > 10) {
        throw new ApiError(400, "Maximum 10 tags allowed");
    }
    
    next();
};