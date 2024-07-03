const Notification = require("../models/notification.model");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { getIO } = require("../utils/socket");

exports.sendNotification = async (
    userId,
    title = "New Notification",
    content,
) => {
try {
        const notification = await Notification.create({
            userId,
            title,
            content,
        });
        getIO().emit(userId, notification);
} catch (error) {
    console.log(error.message);
}
};

exports.getNotificationById = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
        return ApiResponse.errorResponse(res, 404, "Notification not found");
    }
    return ApiResponse.successResponse(
        res,
        200,
        "Notification found",
        notification,
    );
});

exports.getAllNotificationsByUserId = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({
        userId: req.params.id,
    }).sort({
        createdAt: -1,
    });
    if (!notifications) {
        return ApiResponse.errorResponse(res, 404, "No notifications found");
    }
    return ApiResponse.successResponse(
        res,
        200,
        "Notifications found",
        notifications,
    );
});

exports.markNotificationAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findByIdAndUpdate(
        req.params.id,
        { read: true },
        { new: true },
    );
    if (!notification) {
        return ApiResponse.errorResponse(res, 404, "Notification not found");
    }
    return ApiResponse.successResponse(
        res,
        200,
        "Notification marked as read",
        notification,
    );
});

exports.deleteNotificationById = asyncHandler(async (req, res) => {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
        return ApiResponse.errorResponse(res, 404, "Notification not found");
    }
    return ApiResponse.successResponse(res, 200, "Notification deleted");
});
