import { Router } from "express";
import passport from "passport";
import { ApiResponse } from "../utils/ApiResponse.js";

const authRouter = Router();

// Route for initiating Google OAuth authentication
authRouter.get(
  "/google",(req,res,next)=>{
    console.log("google")
    next()
  },
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    prompt: "select_account" 
  })
);

// Route for handling Google OAuth callback
authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: 'http://localhost:5173/',
    successRedirect: 'http://localhost:5173/',
    session: true,
    failureFlash: true 
  }),
  (req, res) => {
    // Add success flash message
    // req.flash("success", "Successfully logged in!");
    
    // Redirect to frontend with success status
    res.redirect(`http://localhost:5173`);
  }
);

// // Route for logging out
// authRouter.get("/logout", (req, res) => {
//   req.logout((err) => {
//     if (err) {
//       return res.status(500).json(new ApiResponse(500, null, "Error logging out"));
//     }
//     res.redirect(`${process.env.CORS_ORIGIN}/login`);
//   });
// });

export default authRouter;