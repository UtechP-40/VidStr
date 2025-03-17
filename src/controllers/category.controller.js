import {Category} from '../models/category.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createCategory = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        throw new ApiError(400, "Category name is required");
    }

    const existingCategory = await Category.findOne({ name: name.toLowerCase() });

    if (existingCategory) {
        throw new ApiError(409, "Category already exists");
    }

    const category = await Category.create({
        name: name.toLowerCase(),
        description
    });

    return res.status(201).json(
        new ApiResponse(201, category, "Category created successfully")
    );
});

const getAllCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find();
    
    return res.status(200).json(
        new ApiResponse(200, categories, "Categories fetched successfully")
    );
});

const getCategoryById = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);

    if (!category) {
        throw new ApiError(404, "Category not found");
    }

    return res.status(200).json(
        new ApiResponse(200, category, "Category fetched successfully")
    );
});

const updateCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const { name, description } = req.body;

    if (!name) {
        throw new ApiError(400, "Category name is required");
    }

    const category = await Category.findByIdAndUpdate(
        categoryId,
        {
            $set: {
                name: name.toLowerCase(),
                description
            }
        },
        { new: true }
    );

    if (!category) {
        throw new ApiError(404, "Category not found");
    }

    return res.status(200).json(
        new ApiResponse(200, category, "Category updated successfully")
    );
});

const deleteCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    const category = await Category.findByIdAndDelete(categoryId);

    if (!category) {
        throw new ApiError(404, "Category not found");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Category deleted successfully")
    );
});

export {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};
