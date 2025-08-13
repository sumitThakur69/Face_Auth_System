import AuthLog from '../models/AuthLog.js';
import User from '../models/User.js';

// @desc    Log authentication attempt
// @route   POST /api/auth/log
// @access  Public
export const logAuthentication = async (req, res) => {
    try {
        const { user_id, success, confidence, timestamp } = req.body;
        
        // Get client information
        const ip_address = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        const user_agent = req.get('User-Agent');

        const authLog = new AuthLog({
            user_id: user_id || null,
            success,
            confidence,
            timestamp: timestamp ? new Date(timestamp * 1000) : new Date(),
            ip_address,
            user_agent
        });

        await authLog.save();

        // Update user's last login and login count if successful
        if (success && user_id) {
            await User.findByIdAndUpdate(user_id, {
                last_login: new Date(),
                $inc: { login_count: 1 }
            });
        }

        res.status(201).json({
            success: true,
            message: 'Authentication logged successfully',
            data: {
                log_id: authLog._id
            }
        });

    } catch (error) {
        console.error('Error logging authentication:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while logging authentication'
        });
    }
};

// @desc    Get authentication logs
// @route   GET /api/auth/logs
// @access  Public
export const getAuthLogs = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            success, 
            user_id,
            date_from,
            date_to 
        } = req.query;

        // Build query
        let query = {};
        
        if (success !== undefined) {
            query.success = success === 'true';
        }
        
        if (user_id) {
            query.user_id = user_id;
        }

        // Date range filter
        if (date_from || date_to) {
            query.timestamp = {};
            if (date_from) query.timestamp.$gte = new Date(date_from);
            if (date_to) query.timestamp.$lte = new Date(date_to);
        }

        const logs = await AuthLog.find(query)
            .populate('user_id', 'name email')
            .sort({ timestamp: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await AuthLog.countDocuments(query);

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_logs: total,
                    per_page: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching auth logs:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching authentication logs'
        });
    }
};

// @desc    Get authentication statistics
// @route   GET /api/auth/stats
// @access  Public
export const getAuthStats = async (req, res) => {
    try {
        const { period = '24h' } = req.query;
        
        // Calculate date range based on period
        let dateRange = null;
        if (period !== 'all') {
            const now = new Date();
            const start = new Date();
            
            switch (period) {
                case '1h':
                    start.setHours(now.getHours() - 1);
                    break;
                case '24h':
                    start.setDate(now.getDate() - 1);
                    break;
                case '7d':
                    start.setDate(now.getDate() - 7);
                    break;
                case '30d':
                    start.setDate(now.getDate() - 30);
                    break;
                default:
                    start.setDate(now.getDate() - 1);
            }
            
            dateRange = { start, end: now };
        }

        // Get authentication statistics
        const authStats = await AuthLog.getStats(dateRange);
        
        // Get total users count
        const totalUsers = await User.countDocuments({ is_active: true });
        
        // Get recent activity breakdown
        const recentBreakdown = await AuthLog.aggregate([
            ...(dateRange ? [{ $match: { timestamp: { $gte: dateRange.start, $lte: dateRange.end } } }] : []),
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: period === '1h' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
                            date: '$timestamp'
                        }
                    },
                    attempts: { $sum: 1 },
                    successful: { $sum: { $cond: ['$success', 1, 0] } }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 24 }
        ]);

        res.json({
            success: true,
            data: {
                period,
                summary: {
                    ...authStats,
                    total_users: totalUsers
                },
                breakdown: recentBreakdown
            }
        });

    } catch (error) {
        console.error('Error fetching auth stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching authentication statistics'
        });
    }
};

// @desc    Get authentication summary for dashboard
// @route   GET /api/auth/dashboard
// @access  Public
export const getDashboardStats = async (req, res) => {
    try {
        // Get overall statistics
        const totalStats = await AuthLog.getStats();
        
        // Get 24h statistics
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const recent24h = await AuthLog.getStats({ 
            start: yesterday, 
            end: new Date() 
        });

        // Get total users
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ is_active: true });

        // Get recent failed attempts (potential security issues)
        const recentFailures = await AuthLog.find({ 
            success: false,
            timestamp: { $gte: yesterday }
        })
        .populate('user_id', 'name email')
        .sort({ timestamp: -1 })
        .limit(10);

        // Get top users by login count
        const topUsers = await User.find({ is_active: true })
            .select('name email login_count last_login')
            .sort({ login_count: -1 })
            .limit(5);

        res.json({
            success: true,
            data: {
                overview: {
                    total_users: totalUsers,
                    active_users: activeUsers,
                    total_attempts: totalStats.total_attempts,
                    success_rate: totalStats.success_rate
                },
                recent_24h: recent24h,
                recent_failures: recentFailures,
                top_users: topUsers
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching dashboard statistics'
        });
    }
};