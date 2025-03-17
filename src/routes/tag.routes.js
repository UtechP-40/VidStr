import { Router } from "express";
// import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createTag, getAllTags } from "../controllers/tag.controller.js";

const router = Router();

router.get("/", getAllTags);
// router.post("/", verifyJWT, createTag);

export default router;