import User from '../models/User.js';
import { validationResult } from 'express-validator';

// @desc    Register a new face
// @route   POST /api/faces/register
// @access  Public
export const registerFace = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { name, email, face_encoding, face_image } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        // Create new user
        const newUser = new User({
            name,
            email,
            face_encoding,
            face_image
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'Face registered successfully',
            data: {
                user: newUser.profile
            }
        });

    } catch (error) {
        console.error('Face registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during face registration'
        });
    }
};

// @desc    Get all registered faces
// @route   GET /api/faces/all
// @access  Public
export const getAllFaces = async (req, res) => {
    try {
        const users = await User.findActiveUsers()
            .select('name email face_encoding created_at')
            .sort({ created_at: -1 });

        res.json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        console.error('Error fetching faces:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching faces'
        });
    }
};

// @desc    Get user's face image
// @route   GET /api/faces/:id/image
// @access  Public
export const getFaceImage = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select('face_image name');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Convert base64 to image buffer
        const imageBuffer = Buffer.from(user.face_image, 'base64');
        
        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': imageBuffer.length,
            'Content-Disposition': `inline; filename="${user.name}_face.jpg"`
        });
        res.end(imageBuffer);

    } catch (error) {
        console.error('Error fetching face image:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching face image'
        });
    }
};

// @desc    Update face encoding
// @route   PUT /api/faces/:id
// @access  Public
export const updateFaceEncoding = async (req, res) => {
    try {
        const { id } = req.params;
        const { face_encoding, face_image } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (face_encoding) user.face_encoding = face_encoding;
        if (face_image) user.face_image = face_image;

        await user.save();

        res.json({
            success: true,
            message: 'Face encoding updated successfully',
            data: {
                user: user.profile
            }
        });

    } catch (error) {
        console.error('Error updating face encoding:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while updating face encoding'
        });
    }
};

// @desc    Delete face
// @route   DELETE /api/faces/:id
// @access  Public
export const deleteFace = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Face deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting face:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while deleting face'
        });
    }
};