import mongoose from "mongoose";

const dislikeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    contentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    contentType: {
        type: String,
        required: true,
        enum: ["Video", "Comment", "Tweet"],
        default: "Comment"  // Since we're handling comment dislikes
    }
}, { timestamps: true });

dislikeSchema.index({ userId: 1, contentId: 1, contentType: 1 }, { unique: true });

export const Dislike = mongoose.model("Dislike", dislikeSchema);
