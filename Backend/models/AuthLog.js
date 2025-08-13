import mongoose from 'mongoose';

const authLogSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    success: {
        type: Boolean,
        required: [true, 'Success status is required']
    },
    confidence: {
        type: Number,
        required: [true, 'Confidence score is required'],
        min: [0, 'Confidence cannot be less than 0'],
        max: [1, 'Confidence cannot be greater than 1']
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    ip_address: {
        type: String,
        default: null
    },
    user_agent: {
        type: String,
        default: null
    },
    attempt_type: {
        type: String,
        enum: ['face_recognition', 'manual', 'api'],
        default: 'face_recognition'
    }
}, {
    timestamps: true
});

// Indexes for better query performance
authLogSchema.index({ user_id: 1 });
authLogSchema.index({ success: 1 });
authLogSchema.index({ timestamp: -1 });
authLogSchema.index({ user_id: 1, timestamp: -1 });

// Static method to get authentication statistics
authLogSchema.statics.getStats = async function(dateRange = null) {
    const matchStage = dateRange ? {
        timestamp: {
            $gte: dateRange.start,
            $lte: dateRange.end
        }
    } : {};

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                total_attempts: { $sum: 1 },
                successful_attempts: {
                    $sum: { $cond: ['$success', 1, 0] }
                },
                failed_attempts: {
                    $sum: { $cond: ['$success', 0, 1] }
                },
                avg_confidence: { $avg: '$confidence' }
            }
        },
        {
            $project: {
                _id: 0,
                total_attempts: 1,
                successful_attempts: 1,
                failed_attempts: 1,
                success_rate: {
                    $multiply: [
                        { $divide: ['$successful_attempts', '$total_attempts'] },
                        100
                    ]
                },
                avg_confidence: { $round: ['$avg_confidence', 3] }
            }
        }
    ]);

    return stats[0] || {
        total_attempts: 0,
        successful_attempts: 0,
        failed_attempts: 0,
        success_rate: 0,
        avg_confidence: 0
    };
};

// Static method to get user activity
authLogSchema.statics.getUserActivity = function(userId, limit = 10) {
    return this.find({ user_id: userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('user_id', 'name email');
};

const AuthLog = mongoose.model('AuthLog', authLogSchema);

export default AuthLog;