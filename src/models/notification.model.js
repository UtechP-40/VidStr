import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["LIKE", "COMMENT", "SUBSCRIBE", "VIDEO", "SYSTEM"],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    onModel: {
        type: String,
        required: true,
        enum: ["Video", "Comment", "User"]
    },
    relatedItem: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: "onModel"
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export const Notification = mongoose.model("Notification", notificationSchema);