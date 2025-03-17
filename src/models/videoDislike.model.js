import mongoose from "mongoose";

const videoDislikeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for preventing duplicate dislikes
videoDislikeSchema.index({ user: 1, video: 1 }, { unique: true });

// Pre-save middleware to validate user and video existence
videoDislikeSchema.pre('save', async function(next) {
    try {
        const [userExists, videoExists] = await Promise.all([
            mongoose.model('User').exists({ _id: this.user }),
            mongoose.model('Video').exists({ _id: this.video })
        ]);

        if (!userExists) throw new Error('User not found');
        if (!videoExists) throw new Error('Video not found');
        
        next();
    } catch (error) {
        next(error);
    }
});

export const VideoDislike = mongoose.model('VideoDislike', videoDislikeSchema);