import mongoose, {Schema} from "mongoose";

const userSchema = new Schema(
    {
        user:{
            type:String,
            required:true,
            unique:true,
            trim:true,
           lowercase:true,
           index: true
        },
        user:{
            type:String,
            required:true,
            unique:true,
            trim:true,
           lowercase:true,
        },
        fullname:{
            type:String,
            required:true,
            // unique:true,
            trim:true,
        //    lowercase:true,
           index:true
        },
        avatar:{
            type:String,
            required:true,
            trim:true,
        },
        coverImage:{
            type:String
            // required:true,
            // trim:true,
        },
        watchHistory:[
            {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password:{
        type:String,
        required: [true,"Password is required"]
    },
    refreshToken:{
        type:String
        // default:null
    }},{timestamps:true}
)


export const User = mongoose.model("User",userSchema)