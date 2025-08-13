import express from 'express';
import { body } from 'express-validator';
import {
    registerFace,
    getAllFaces,
    getFaceImage,
    updateFaceEncoding,
    deleteFace
} from '../controllers/faceController.js';

const router = express.Router();

// Validation middleware for face registration
const validateFaceRegistration = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('face_encoding')
        .notEmpty()
        .withMessage('Face encoding is required'),
    body('face_image')
        .notEmpty()
        .withMessage('Face image is required')
];

// Validation middleware for face update
const validateFaceUpdate = [
    body('face_encoding')
        .optional()
        .notEmpty()
        .withMessage('Face encoding cannot be empty if provided'),
    body('face_image')
        .optional()
        .notEmpty()
        .withMessage('Face image cannot be empty if provided')
];

// Routes
router.post('/register', validateFaceRegistration, registerFace);
router.get('/all', getAllFaces);
router.get('/:id/image', getFaceImage);
router.put('/:id', validateFaceUpdate, updateFaceEncoding);
router.delete('/:id', deleteFace);

export default router;