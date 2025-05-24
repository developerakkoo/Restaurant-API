// controllers/chat.controller.js
const ChatMessage = require("../models/message.model");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { getIO } = require("../utils/socket");
const User = require("../models/user.model");
const Admin = require("../models/admin.model");

/**
 * @function getChatHistory
 * @async
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @throws {ApiError} Throws an ApiError if chat history cannot be retrieved
 * @description Retrieves chat history for a specific user
 */
exports.getChatHistory = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const messages = await ChatMessage.find({ userId,orderId:req.query.orderId })
        .sort({ time: 1 })
        .limit(50);

    if (!messages) {
        throw new ApiError(404, "No chat history found");
    }

    return res.status(200).json(
        new ApiResponse(200, messages, "Chat history retrieved successfully")
    );
});

exports.getChatHistoryAdmin = asyncHandler(async (req, res) => {
    const { userId , adminId} = req.params;
    const messages = await ChatMessage.find({ userId, adminId })
        .sort({ time: 1 })
        .limit(50);

    if (!messages) {
        throw new ApiError(404, "No chat history found");
    }

    return res.status(200).json(
        new ApiResponse(200, messages, "Chat history retrieved successfully")
    );
});
/**
 * @function getActiveChats
 * @async
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @throws {ApiError} Throws an ApiError if active chats cannot be retrieved
 * @description Retrieves all active chats for admin
 */
exports.getActiveChats = asyncHandler(async (req, res) => {
    const activeChats = await ChatMessage.find({ isRead: false })
        .sort({ time: -1 })
        .populate('userId', 'name email phoneNumber')
        .exec();

    if (!activeChats) {
        throw new ApiError(404, "No active chats found");
    }

    // Group by userId and get the last message for each user
    const groupedChats = activeChats.reduce((acc, message) => {
        if (!acc[message.userId._id]) {
            acc[message.userId._id] = {
                _id: message.userId._id,
                user: message.userId,
                lastMessage: message
            };
        }
        return acc;
    }, {});

    const result = Object.values(groupedChats);

    return res.status(200).json(
        new ApiResponse(200, result, "Active chats retrieved successfully")
    );
});

/**
 * @function markAsRead
 * @async
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @throws {ApiError} Throws an ApiError if messages cannot be marked as read
 * @description Marks all messages for a user as read
 */
exports.markAsRead = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const result = await ChatMessage.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true } }
    );

    if (!result) {
        throw new ApiError(404, "No messages found to mark as read");
    }

    return res.status(200).json(
        new ApiResponse(200, result, "Messages marked as read successfully")
    );
});

/**
 * @function sendMessage
 * @async
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @throws {ApiError} Throws an ApiError if message cannot be sent
 * @description Sends a new message in the chat
 */
exports.sendMessage = asyncHandler(async (req, res) => {
    const { userId, text, isUser, adminId,orderId } = req.body;

    const message = await ChatMessage.create({
        userId,
        adminId,
        text,
        isUser,
        time: new Date(),
        isRead: !isUser,
        orderId
    });

    if (!message) {
        throw new ApiError(500, "Failed to send message");
    }

    // Emit message through socket
    const io = getIO();
    if (isUser) {
        io.to('admins').emit('newMessage', message);
    }
    io.to(`user_${userId}`).emit('adminMessage', message);

    return res.status(201).json(
        new ApiResponse(201, message, "Message sent successfully")
    );
});

/**
 * @function setupChatHandlers
 * @description Sets up chat-specific socket event handlers
 */
exports.setupChatHandlers = (socket) => {
    // User joins support chat
    socket.on('joinSupport', async (data) => {
        const { userId } = data;
        socket.join(`user_${userId}`);
        
        // Get chat history
        const messages = await ChatMessage.find({ userId })
            .sort({ time: 1 })
            .limit(50);
        
        socket.emit('chatHistory', messages);
    });

    // Admin joins user chat
    socket.on('adminJoinChat', async (data) => {
        const { userId, adminId } = data;
        socket.join(`user_${userId}`);
        
        // Mark messages as read
        await ChatMessage.updateMany(
            { userId, isRead: false },
            { $set: { isRead: true, adminId } }
        );
    });

    // Handle new messages
    socket.on('userMessage', async (data) => {
        const { text, userId } = data;
        
        // Save message to database
        const message = await ChatMessage.create({
            userId,
            text,
            isUser: true,
            time: new Date()
        });

        // Emit to admin
        socket.to('admins').emit('newMessage', message);
        // Emit to specific user
        socket.to(`user_${userId}`).emit('adminMessage', message);
    });

    // Handle admin messages
    socket.on('adminMessage', async (data) => {
        const { text, userId, adminId } = data;
        
        // Save message to database
        const message = await ChatMessage.create({
            userId,
            adminId,
            text,
            isUser: false,
            time: new Date(),
            isRead: true
        });

        // Emit to user
        socket.to(`user_${userId}`).emit('adminMessage', message);
    });
};