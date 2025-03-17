import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/user.model.js";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config({
    path: './env'
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8000/api/v1/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        let user = await User.findOne({ username: email });

        if (!user) {
          // Create new user from Google profile
          user = await User.create({
            username: email,
            email:email,
            fullName: profile.displayName,
            avatar: profile.photos[0].value,
            password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), 
            watchHistory: [],
            refreshToken: null,
            googleId: profile.id
          });
        } else if (!user.googleId) {
          // Link Google account to existing user
          user.googleId = profile.id;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password -refreshToken');
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});