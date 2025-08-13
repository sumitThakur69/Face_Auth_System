import express from 'express';
import { body, query } from 'express-validator';
import {
    logAuthentication,
    getAuthLogs,
    getAuthStats,
    getDashboardStats
} from '../controllers/authController.js';

const router = express.Router();

// Validation middleware for authentication logging
const validateAuthLog = [
    body('user_id')
        .optional()
        .isMongoId()
        .withMessage('Invalid user ID format'),
    body('success')
        .isBoolean()
        .withMessage('Success must be a boolean value'),
    body('confidence')
        .isFloat({ min: 0, max: 1 })
        .withMessage('Confidence must be a number between 0 and 1'),
    body('timestamp')
        .optional()
        .isNumeric()
        .withMessage('Timestamp must be a valid number')
];

// Validation middleware for auth logs query
const validateAuthLogsQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('success')
        .optional()
        .isBoolean()
        .withMessage('Success filter must be a boolean'),
    query('user_id')
        .optional()
        .isMongoId()
        .withMessage('Invalid user ID format'),
    query('date_from')
        .optional()
        .isISO8601()
        .withMessage('date_from must be a valid ISO date'),
    query('date_to')
        .optional()
        .isISO8601()
        .withMessage('date_to must be a valid ISO date')
];

// Validation middleware for stats query
const validateStatsQuery = [
    query('period')
        .optional()
        .isIn(['1h', '24h', '7d', '30d', 'all'])
        .withMessage('Period must be one of: 1h, 24h, 7d, 30d, all')
];

// Routes
router.post('/log', validateAuthLog, logAuthentication);
router.get('/logs', validateAuthLogsQuery, getAuthLogs);
router.get('/stats', validateStatsQuery, getAuthStats);
router.get('/dashboard', getDashboardStats);

export default router;