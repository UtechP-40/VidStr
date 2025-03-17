import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import rateLimit from 'express-rate-limit'
import session from "express-session"
import searchRouter from "./routes/search.routes.js";
import tagRouter from "./routes/tag.routes.js"
const app = express()
import passport from "passport"
import {ApiResponse} from "./utils/ApiResponse.js"
// import dotenv from "dotenv"
// dotenv.config()
import "./config/passport.config.js"
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});


app.use(limiter);
app.use(cors({
    origin: process.env.ORIGIN,
    credentials: true
}))
app.use(
    session({
      secret: process.env.REFRESH_TOKEN_SECRATE,
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false },
    })
);
  
app.use(passport.initialize());
app.use(passport.session());


app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import userRouter from './routes/user.routes.js'
import healthcheckRouter from "./routes/healthcheck.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"
import authRouter from "./routes/auth.routes.js";
import notificationRouter from "./routes/notification.routes.js";

// API specific rate limiters
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 requests per hour for auth routes
    message: 'Too many authentication attempts, please try again later.'
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes for API routes
    message: 'Too many API requests, please try again later.'
});

//routes declaration
import recommendationRouter from "./routes/recommendation.routes.js";
import categoryRouter from "./routes/category.routes.js"

app.use("/api/v1/category", categoryRouter)
app.use("/api/v1/recommendations", recommendationRouter);
app.use("/api/v1/auth", authLimiter, authRouter); 
app.use("/api/v1/healthcheck", apiLimiter, healthcheckRouter)
app.use("/api/v1/users", apiLimiter, userRouter)
app.use("/api/v1/tweets", apiLimiter, tweetRouter)
app.use("/api/v1/subscriptions", apiLimiter, subscriptionRouter)
app.use("/api/v1/videos", apiLimiter, videoRouter)
app.use("/api/v1/comments", apiLimiter, commentRouter)
app.use("/api/v1/likes", apiLimiter, likeRouter)
app.use("/api/v1/playlist", apiLimiter, playlistRouter)
app.use("/api/v1/dashboard", apiLimiter, dashboardRouter)
app.use("/api/v1/notifications", apiLimiter, notificationRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/tags", tagRouter)

app.use((err, req, res, next) => {
    console.log(err)
    res.status(err.statusCode || 500).json(new ApiResponse(err.statusCode || 500, err.data || null, err.message || 'Internal Server Error'));
});

// http://localhost:8000/api/v1/users/register
// import "./seeds/comment.seed.js"

export { app }