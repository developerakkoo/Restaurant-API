// routes/chat.routes.js
const express = require('express');
const chatController = require('../controller/message.controller');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();



// Chat routes
router.get('/history/:userId', asyncHandler(chatController.getChatHistory));
router.get('/history/admin/:userId/:adminId', asyncHandler(chatController.getChatHistoryAdmin));
router.get('/active', asyncHandler(chatController.getActiveChats));
router.put('/read/:userId', asyncHandler(chatController.markAsRead));
router.post('/send', asyncHandler(chatController.sendMessage));

module.exports = router;