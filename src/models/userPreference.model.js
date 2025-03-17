import mongoose from "mongoose";

const userPreferenceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    preferredCategories: [{
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category'
        },
        weight: {
            type: Number,
            default: 1.0
        }
    }],
    preferredTags: [{
        tag: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tag'
        },
        weight: {
            type: Number,
            default: 1.0
        }
    }],
    watchHistory: [{
        video: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Video'
        },
        watchCount: {
            type: Number,
            default: 1
        },
        totalDuration: {
            type: Number,
            default: 0
        },
        lastWatched: {
            type: Date,
            default: Date.now
        }
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Static method for updating preferences
userPreferenceSchema.statics.updatePreferences = async function(userId, videoId, interactionType, duration = 0) {
    try {
        const video = await mongoose.model('Video').findById(videoId)
            .populate('category')
            .populate('tags');
            
        if (!video) {
            throw new Error('Video not found');
        }

        let preference = await this.findOne({ user: userId });
        if (!preference) {
            preference = await this.create({ 
                user: userId,
                preferredCategories: [],
                preferredTags: [],
                watchHistory: []
            });
        }

        // Update based on interaction type
        switch(interactionType) {
            case 'WATCH':
                await this.handleWatchInteraction(preference, video, duration);
                break;
            case 'LIKE':
                await this.handleLikeInteraction(preference, video);
                break;
            default:
                break;
        }

        preference.lastUpdated = new Date();
        await preference.save();
        
        return preference;
    } catch (error) {
        console.error('Error updating user preferences:', error);
        throw error;
    }
};

// Helper methods
userPreferenceSchema.statics.handleWatchInteraction = async function(preference, video, duration) {
    const historyIndex = preference.watchHistory.findIndex(
        h => h.video?.toString() === video._id.toString()
    );
    
    if (historyIndex >= 0) {
        preference.watchHistory[historyIndex].watchCount += 1;
        preference.watchHistory[historyIndex].totalDuration += duration;
        preference.watchHistory[historyIndex].lastWatched = new Date();
    } else {
        preference.watchHistory.push({
            video: video._id,
            watchCount: 1,
            totalDuration: duration,
            lastWatched: new Date()
        });
    }
};

userPreferenceSchema.statics.handleLikeInteraction = async function(preference, video) {
    if (video.category) {
        const categoryIndex = preference.preferredCategories.findIndex(
            pc => pc.category?.toString() === video.category._id.toString()
        );
        
        if (categoryIndex >= 0) {
            preference.preferredCategories[categoryIndex].weight += 0.5;
        } else {
            preference.preferredCategories.push({
                category: video.category._id,
                weight: 1.0
            });
        }
    }

    for (const tag of video.tags || []) {
        const tagIndex = preference.preferredTags.findIndex(
            pt => pt.tag?.toString() === tag._id.toString()
        );
        
        if (tagIndex >= 0) {
            preference.preferredTags[tagIndex].weight += 0.3;
        } else {
            preference.preferredTags.push({
                tag: tag._id,
                weight: 1.0
            });
        }
    }
};

export const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);