import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = Router();

// router.post("/register", registerUser);

router.route("/register").post(upload.fields([
    {name: "avatar", maxCount: 1},
    {name: "gallery", maxCount: 8}
]), registerUser);

export default router