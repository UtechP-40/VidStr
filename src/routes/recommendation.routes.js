import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { getRecommendations, trackUserAction } from "../controllers/recommendation.controller.js";

const router = Router();

router.use(authenticate);

router.route("/").get(getRecommendations);
router.route("/track").post(trackUserAction);

export default router;