const Message = require("../models/message.model");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { responseMessage } = require("../constant");
const { deleteFile } = require("../utils/deleteFile");
const chatModel = require("../models/chat.model");
const { sendNotification } = require("./notification.controller");

exports.getMyChatList = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { username } = req.query;

    // Find chat lists involving the user
    let chatListQuery = chatModel.find({ members: userId });

    // If a username is provided, filter by username
    if (username) {
        chatListQuery = chatListQuery.populate({
            path: "members",
            match: { name: { $regex: username, $options: "i" } }, // case-insensitive search
            select: "name profile_image isOnline",
        });
    } else {
        chatListQuery = chatListQuery.populate({
            path: "members",
            select: "name profile_image isOnline",
        });
    }

    const chatList = await chatListQuery.exec();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                chatList,
                responseMessage.GET_CHAT_LIST_SUCCESS,
            ),
        );
});

exports.checkChatExist = asyncHandler(async (req, res, next) => {
    const { senderId, receiverId } = req.body;

    // Check if a chat exists with both senderId and receiverId in any order and exactly two members
    let chat = await chatModel.findOne({
        $and: [
            { members: { $all: [senderId, receiverId] } },
            { members: { $size: 2 } },
        ],
    });

    if (chat) {
        req.body.chatId = chat._id;
        return this.sendMessage(req, res);
    }

    // If no chat exists, create a new one
    chat = await chatModel.create({ members: [senderId, receiverId] });
    req.body.chatId = chat._id;
    next();
});
9;
exports.sendMessage = asyncHandler(async (req, res) => {
    const { chatId, senderId, receiverId, message } = req.body;
    const newMessage = await Message.create({
        senderId,
        receiverId,
        message,
        chatId,
    });
    sendNotification(receiverId, "New Message", newMessage);
    return res
        .status(201)
        .json(new ApiResponse(201, newMessage, responseMessage.Message_SENT));
});

exports.sendMultimediaMessage = asyncHandler(async (req, res) => {
    const { chatId, senderId, receiverId } = req.body;
    const { filename } = req.file;
    const local_filePath = `upload/${filename}`;
    let image_url = `https://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        image_url = `https://${req.hostname}:8000/upload/${filename}`;
    }
    const newMessage = await Message.create({
        chatId,
        senderId,
        receiverId,
        isImage: true,
        image_url,
        local_filePath,
    });
    sendNotification(receiverId, "New Message", newMessage);

    return res
        .status(201)
        .json(new ApiResponse(201, newMessage, responseMessage.Message_SENT));
});

exports.getMessageById = asyncHandler(async (req, res) => {
    const { MessageId } = req.params;
    const Message = await Message.findById(MessageId);
    if (!Message) {
        throw new ApiError(404, responseMessage.Message_NOT_FOUND);
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                Message,
                responseMessage.Message_FETCHED_SUCCESSFULLY,
            ),
        );
});

exports.getAllMessageByUserId = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const Messages = await Message.find({
        $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: -1 });
    if (!Messages) {
        throw new ApiError(404, responseMessage.Message_NOT_FOUND);
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                Messages,
                responseMessage.Message_FETCHED_SUCCESSFULLY,
            ),
        );
});

exports.markAsRead = asyncHandler(async (req, res) => {
    const { MessageId } = req.params;
    const Message = await Message.findById(MessageId);
    if (!Message) {
        throw new ApiError(404, responseMessage.Message_NOT_FOUND);
    }
    const updatedMessage = await Message.findByIdAndUpdate(
        MessageId,
        { $set: { read: true } },
        { new: true },
    );
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedMessage,
                responseMessage.Message_MARKED_AS_READ_SUCCESSFULLY,
            ),
        );
});

exports.deleteMessageById = asyncHandler(async (req, res) => {
    const { MessageId } = req.params;
    const Message = await Message.findById(MessageId);
    if (!Message) {
        throw new ApiError(404, responseMessage.Message_NOT_FOUND);
    }
    if (Message.isImage === true) {
        deleteFile(Message.local_filePath);
    }
    await Message.deleteOne();
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                responseMessage.Message_DELETED_SUCCESSFULLY,
            ),
        );
});
