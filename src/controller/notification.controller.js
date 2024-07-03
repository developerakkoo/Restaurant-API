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
        return res
            .status(404)
            .json(ApiResponse.errorResponse(404, {}, "Notification not found"));
    }
    return res.status.json(
        new ApiResponse(200, notification, "Notification found"),
    );
});

exports.getAllNotificationsByUserId = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({
        userId: req.params.userId,
    }).sort({
        createdAt: -1,
    });
    if (notifications.length === 0) {
        return res
            .status(404)
            .json(new ApiResponse(404, {}, "No notifications found"));
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                notifications,
                "notification fetched successfully",
            ),
        );
});

exports.markNotificationAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findByIdAndUpdate(
        req.params.id,
        { read: true },
        { new: true },
    );
    if (!notification) {
        return res
            .status(200)
            .json(new ApiResponse(404, {}, "Notification not found"));
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, notification, "Notification marked as read"),
        );
});

exports.deleteNotificationById = asyncHandler(async (req, res) => {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
        return res
            .status(404)
            .json(new ApiResponse(404,{}, "Notification not found"));
    }
    return res
        .status(200)
        .json(new ApiResponse(200,{}, "Notification deleted"));
});
