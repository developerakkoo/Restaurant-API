const Notification = require("../models/notification.model");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { responseMessage } = require("../constant");
const { getIO } = require("../utils/socket");

exports.sendNotification = asyncHandler(async (req, res) => {
    const { senderId, receiverId, message } = req.body;
    const notification = await Notification.create({
        senderId,
        receiverId,
        message,
    });
    getIO().emit(receiverId, notification);
    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                notification,
                responseMessage.NOTIFICATION_SENT,
            ),
        );
});

exports.getNotificationById = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);
    if (!notification) {
        throw new ApiError(404, responseMessage.NOTIFICATION_NOT_FOUND);
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                notification,
                responseMessage.NOTIFICATION_FETCHED_SUCCESSFULLY,
            ),
        );
});

exports.getAllNotificationByUserId = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const notifications = await Notification.find({
        $or: [{ senderId: userId }, { receiverId: userId }],
    });
    if (!notifications) {
        throw new ApiError(404, responseMessage.NOTIFICATION_NOT_FOUND);
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                notifications,
                responseMessage.NOTIFICATION_FETCHED_SUCCESSFULLY,
            ),
        );
});

exports.markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);
    if (!notification) {
        throw new ApiError(404, responseMessage.NOTIFICATION_NOT_FOUND);
    }
    const updatedNotification = await Notification.findByIdAndUpdate(
        notificationId,
        { $set: { read: true } },
        { new: true },
    );
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedNotification,
                responseMessage.NOTIFICATION_MARKED_AS_READ_SUCCESSFULLY,
            ),
        );
});

exports.deleteNotificationById = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);
    if (!notification) {
        throw new ApiError(404, responseMessage.NOTIFICATION_NOT_FOUND);
    }
    await notification.deleteOne();
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                responseMessage.NOTIFICATION_DELETED_SUCCESSFULLY,
            ),
        );
});
