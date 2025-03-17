import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
    {
        content: {
            type: String,
            required: true
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
)

// Add virtual for likes count
commentSchema.virtual('likesCount').get(async function() {
    const likeCount = await mongoose.model("Like").countDocuments({
        comment: this._id,
        type: "LIKE"
    });
    return likeCount;
});

// Add virtual for dislikes count
commentSchema.virtual('dislikesCount').get(async function() {
    const dislikeCount = await mongoose.model("Dislike").countDocuments({
        comment: this._id
    });
    return dislikeCount;
});

// Add method to check if user has liked
commentSchema.methods.isLikedByUser = async function(userId) {
    const likeCount = await mongoose.model("Like").countDocuments({
        comment: this._id,
        likedBy: userId,
        type: "LIKE"
    });
    return likeCount > 0;
};

// Add method to check if user has disliked
commentSchema.methods.isDislikedByUser = async function(userId) {
    const dislikeCount = await mongoose.model("Dislike").countDocuments({
        comment: this._id,
        dislikedBy: userId
    });
    return dislikeCount > 0;
};

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment", commentSchema)