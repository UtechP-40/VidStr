import mongoose from "mongoose";

const tagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    description: {
        type: String,
        trim: true
    },
    videos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
    }],
    usageCount: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Middleware to update usage count
tagSchema.pre('save', function(next) {
    if (this.isNew) {
        this.usageCount = this.videos.length;
    } else if (this.isModified('videos')) {
        this.usageCount = this.videos.length;
    }
    next();
});

// Static method to find or create tags
tagSchema.statics.findOrCreateTags = async function(tagNames) {
    const tags = [];
    
    for (const name of tagNames) {
        const normalizedName = name.toLowerCase().trim();
        let tag = await this.findOne({ name: normalizedName });
        
        if (!tag) {
            tag = await this.create({ 
                name: normalizedName,
                usageCount: 1
            });
        }
        
        tags.push(tag._id);
    }
    
    return tags;
};

// Add these methods to your existing Tag model

// Method to get popular tags
tagSchema.statics.getPopularTags = async function(limit = 10) {
    return this.aggregate([
        { $match: { isActive: true } },
        { $sort: { usageCount: -1 } },
        { $limit: limit }
    ]);
};

// Method to get related tags
tagSchema.statics.getRelatedTags = async function(tagId, limit = 5) {
    const tag = await this.findById(tagId);
    if (!tag) return [];
    
    return this.aggregate([
        {
            $match: {
                _id: { $ne: tag._id },
                category: tag.category,
                isActive: true
            }
        },
        { $sort: { usageCount: -1 } },
        { $limit: limit }
    ]);
};

export const Tag = mongoose.model('Tag', tagSchema);