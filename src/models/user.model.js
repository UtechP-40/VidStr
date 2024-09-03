import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv";
dotenv.config({
    path: './env'
});

const userSchema = new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            trim:true,
           lowercase:true,
           index: true
        },
        fullName:{
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

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            fullName:this.fullName,
            username:this.username
    },
    process.env.ACCESS_TOKEN_SECRATE,
    ),
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id:this._id
    },
    process.env.REFRESH_TOKEN_SECRATE,
    ),
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
}


export const User = mongoose.model("User",userSchema)