import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    likeableId: {
        type: Schema.Types.ObjectId,
        refPath: 'likeableType',
        required: true
    },
    likeableType: {
        type: String,
        enum: ['Comment', 'Video'],
        required: true
    }
}, { timestamps: true });

export const Like = mongoose.model("Like", likeSchema);