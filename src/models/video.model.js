import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema({
        videoFile:{
            type: String,
            required: true
        },
        thumbnail:{ 
            type: String,
            required: true
        },
        owner:{
            type: Schema.Types.ObjectId,
            ref:"User",
            required: true
        },
        title:{
            type: String,
            required: true,
            trim: true
        },
        description:{
            type: String,
            required: true,
            trim: true
        },
        duration:{
            type: Number,
            required: true
        },
        views:{
            type: Number,
            default: 0
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
            index: true
        },
        tags: [{
            type: Schema.Types.ObjectId,
            ref: 'Tag',
            index: true
        }],
        averageWatchDuration: {
            type: Number,
            default: 0
        },
        totalWatchTime: {
            type: Number,
            default: 0
        },
        watchCount: {
            type: Number,
            default: 0
        },
        visibility: {
            type: String,
            enum: ['public', 'private', 'unlisted'],
            default: 'public'
        },
        likes: [{
            type: Schema.Types.ObjectId,
            ref: 'Like'
        }],
        dislikes: [{
            type: Schema.Types.ObjectId,
            ref: 'Dislike'
        }],
        isPublished:{
            type: Boolean,
            default: true
        },
        visibility: {
            type: String,
            enum: ['public', 'private', 'unlisted'],
            default: 'public'
        }
},{
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

// Virtual for likes count
videoSchema.virtual('likesCount').get(function() {
    return this.likes?.length || 0;
});

// Virtual for dislikes count
videoSchema.virtual('dislikesCount').get(function() {
    return this.dislikes?.length || 0;
});

// Method to check if user has liked the video
videoSchema.methods.isLikedByUser = async function(userId) {
    const like = await mongoose.model('Like').findOne({
        video: this._id,
        user: userId
    });
    return !!like;
};

// Method to check if user has disliked the video
videoSchema.methods.isDislikedByUser = async function(userId) {
    const dislike = await mongoose.model('Dislike').findOne({
        video: this._id,
        user: userId
    });
    return !!dislike;
};

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)


// Add middleware to update category video count
videoSchema.pre('save', async function(next) {
    if (this.isNew) {
        await mongoose.model('Category').findByIdAndUpdate(
            this.category,
            { $inc: { videoCount: 1 } }
        );
    }
    next();
});

videoSchema.pre('remove', async function(next) {
    await mongoose.model('Category').findByIdAndUpdate(
        this.category,
        { $inc: { videoCount: -1 } }
    );
    next();
});
