import mongoose,{Schema} from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const refreshTokenSchema = new Schema({
    refresh: {
        type: String,
        required: [true, 'Ttoken is required'],
        unique: [true, 'token should be unique']
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
    },

    createdAt: {
        type: Date,
        default: Date.now(),
        expires: 9 * 24 * 60 * 60 + 23 * 60 * 60 + 58 * 60
    }

})

export default mongoose.model('RefreshToken', refreshTokenSchema);

