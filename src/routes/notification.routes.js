import { Router } from 'express';
import { authenticate } from "../middlewares/auth.middleware.js";
import {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from "../controllers/notification.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getUserNotifications);
router.patch("/mark-all-read", markAllNotificationsAsRead);
router.patch("/:notificationId/read", markNotificationAsRead);

export default router;