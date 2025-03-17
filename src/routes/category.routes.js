import express from 'express';
import { createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory } from '../controllers/category.controller.js';
// import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Create new category (Admin only)
// router.post('/', [verifyToken, isAdmin], createCategory);

// Get all categories
router.get('/', getAllCategories);

// Get category by ID
router.get('/:id', getCategoryById);

// Update category (Admin only)
// router.put('/:id', [verifyToken, isAdmin], updateCategory);

// // Delete category (Admin only)
// router.delete('/:id', [verifyToken, isAdmin], deleteCategory);

export default router;
