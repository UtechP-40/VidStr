import mongoose from "mongoose";

const videoInteractionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true
    },
    type: {
        type: String,
        enum: ['WATCH', 'LIKE', 'CREATE', 'SHARE'],
        required: true
    },
    duration: {
        type: Number,
        default: 0,
        validate: {
            validator: function(v) {
                return v >= 0;
            },
            message: 'Duration must be a non-negative number'
        }
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Remove all existing indexes first
const cleanupIndexes = async () => {
    try {
        const VideoInteraction = mongoose.model('VideoInteraction');
        await VideoInteraction.collection.dropIndexes();
    } catch (error) {
        console.error('Error dropping indexes:', error);
    }
};

// Create new index after cleanup
videoInteractionSchema.post('model', async function() {
    await cleanupIndexes();
    this.schema.index({ 
        user: 1, 
        video: 1, 
        type: 1 
    }, { 
        unique: true,
        partialFilterExpression: { type: 'LIKE' }
    });
});

// Validation middleware
videoInteractionSchema.pre('save', async function(next) {
    if (this.isNew && this.type === 'LIKE') {
        const exists = await this.constructor.findOne({
            user: this.user,
            video: this.video,
            type: 'LIKE'
        });
        
        if (exists) {
            throw new Error('User has already liked this video');
        }
    }
    next();
});

const VideoInteraction = mongoose.model('VideoInteraction', videoInteractionSchema);

// Initialize model and indexes
(async () => {
    try {
        await cleanupIndexes();
        await VideoInteraction.init();
    } catch (error) {
        console.error('Error initializing VideoInteraction model:', error);
    }
})();

export { VideoInteraction };
