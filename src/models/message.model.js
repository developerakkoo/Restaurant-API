// models/chatMessage.js
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  adminId: { type: String },
  text: { type: String, required: true },
  isUser: { type: Boolean, default: true },
  time: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);