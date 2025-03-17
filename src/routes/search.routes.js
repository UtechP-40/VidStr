import { Router } from "express";
import { searchContent } from "../controllers/search.controller.js";

const router = Router();

router.route("/").get(searchContent);

export default router;