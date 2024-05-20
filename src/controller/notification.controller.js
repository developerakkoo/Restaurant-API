const Notification = require("../models/notification.model");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { responseMessage } = require("../constant");
const { getIO } = require("../utils/socket");
const { deleteFile } = require("../utils/deleteFile");
const { NotBeforeError } = require("jsonwebtoken");

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

exports.sendMultimediaNotification = asyncHandler(async (req, res) => {
    const { senderId, receiverId } = req.body;
    const { filename } = req.file;
    const local_filePath = `upload/${filename}`;
    let image_url = `${req.protocol}://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        image_url = `${req.protocol}://${req.hostname}:8000/upload/${filename}`;
    }
    const notification = await Notification.create({
        senderId,
        receiverId,
        isImage: true,
        image_url,
        local_filePath
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
    if (notification.isImage === true) {
        deleteFile(notification.local_filePath)
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
