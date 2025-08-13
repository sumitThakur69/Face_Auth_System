import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    face_encoding: {
        type: String,  // Base64 encoded face encoding
        required: [true, 'Face encoding is required']
    },
    face_image: {
        type: String,  // Base64 encoded image
        required: [true, 'Face image is required']
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    last_login: {
        type: Date,
        default: null
    },
    login_count: {
        type: Number,
        default: 0,
        min: [0, 'Login count cannot be negative']
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for better query performance
// userSchema.index({ email: 1 });
userSchema.index({ created_at: -1 });
userSchema.index({ last_login: -1 });

// Virtual for user's full profile (excluding sensitive data)
userSchema.virtual('profile').get(function() {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        created_at: this.created_at,
        last_login: this.last_login,
        login_count: this.login_count,
        is_active: this.is_active
    };
});

// Method to update last login
userSchema.methods.updateLastLogin = function() {
    this.last_login = new Date();
    this.login_count += 1;
    return this.save();
};

// Static method to find active users
userSchema.statics.findActiveUsers = function() {
    return this.find({ is_active: true });
};

const User = mongoose.model('User', userSchema);

export default User;