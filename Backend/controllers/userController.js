import User from '../models/User.js';
import AuthLog from '../models/AuthLog.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Public
export const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', active } = req.query;
        
        // Build query
        let query = {};
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (active !== undefined) {
            query.is_active = active === 'true';
        }

        // Execute query with pagination
        const users = await User.find(query)
            .select('-face_encoding -face_image')
            .sort({ created_at: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_users: total,
                    per_page: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching users'
        });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select('-face_encoding -face_image');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get recent authentication logs for this user
        const recentLogs = await AuthLog.getUserActivity(id, 5);

        res.json({
            success: true,
            data: {
                user,
                recent_activity: recentLogs
            }
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching user'
        });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Public
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, is_active } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if email is being changed and if it already exists
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: id } });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: 'Email already exists'
                });
            }
            user.email = email;
        }

        if (name) user.name = name;
        if (is_active !== undefined) user.is_active = is_active;

        await user.save();

        res.json({
            success: true,
            message: 'User updated successfully',
            data: {
                user: user.profile
            }
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while updating user'
        });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Public
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Optional: Also delete associated auth logs
        // await AuthLog.deleteMany({ user_id: id });

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while deleting user'
        });
    }
};

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Public
export const getUserStats = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select('name email login_count last_login created_at');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get authentication statistics for this user
        const authStats = await AuthLog.aggregate([
            { $match: { user_id: user._id } },
            {
                $group: {
                    _id: null,
                    total_attempts: { $sum: 1 },
                    successful_attempts: { $sum: { $cond: ['$success', 1, 0] } },
                    failed_attempts: { $sum: { $cond: ['$success', 0, 1] } },
                    avg_confidence: { $avg: '$confidence' },
                    last_attempt: { $max: '$timestamp' }
                }
            }
        ]);

        const stats = authStats[0] || {
            total_attempts: 0,
            successful_attempts: 0,
            failed_attempts: 0,
            avg_confidence: 0,
            last_attempt: null
        };

        res.json({
            success: true,
            data: {
                user: user.profile,
                authentication_stats: {
                    ...stats,
                    success_rate: stats.total_attempts > 0 
                        ? ((stats.successful_attempts / stats.total_attempts) * 100).toFixed(2)
                        : 0
                }
            }
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching user statistics'
        });
    }
};