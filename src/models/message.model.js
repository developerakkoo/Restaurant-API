// models/chatMessage.js
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminId: { type: String },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  text: { type: String, required: true },
  isUser: { type: Boolean, default: true },
  time: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);