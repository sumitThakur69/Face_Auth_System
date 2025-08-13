import express from 'express';
import { body, query, param } from 'express-validator';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getUserStats
} from '../controllers/userController.js';

const router = express.Router();

// Validation middleware for user update
const validateUserUpdate = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean value')
];

// Validation middleware for query parameters
const validateUserQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('active')
        .optional()
        .isBoolean()
        .withMessage('Active filter must be a boolean'),
    query('search')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Search term cannot exceed 100 characters')
];

// Validation middleware for MongoDB ObjectId
const validateObjectId = [
    param('id')
        .isMongoId()
        .withMessage('Invalid user ID format')
];

// Routes
router.get('/', validateUserQuery, getAllUsers);
router.get('/:id', validateObjectId, getUserById);
router.put('/:id', validateObjectId, validateUserUpdate, updateUser);
router.delete('/:id', validateObjectId, deleteUser);
router.get('/:id/stats', validateObjectId, getUserStats);

export default router;