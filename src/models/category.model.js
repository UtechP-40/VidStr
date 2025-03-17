import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    videoCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

export const Category = mongoose.model("Category", categorySchema);