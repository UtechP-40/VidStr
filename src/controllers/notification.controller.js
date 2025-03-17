import { asyncHandler } from "../utils/asyncHandler.js";
import { Notification } from "../models/notification.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export const getUserNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .populate("relatedItem")
        .limit(50);

    return res.status(200).json(
        new ApiResponse(200, notifications, "Notifications retrieved successfully")
    );
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: req.user._id },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        throw new ApiError(404, "Notification not found");
    }

    return res.status(200).json(
        new ApiResponse(200, notification, "Notification marked as read")
    );
});

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { isRead: true }
    );

    return res.status(200).json(
        new ApiResponse(200, {}, "All notifications marked as read")
    );
});

export const createNotification = asyncHandler(async (userId, type, content, relatedItem, modelType) => {
    return await Notification.create({
        recipient: userId,
        type,
        content,
        relatedItem,
        onModel: modelType
    });
});