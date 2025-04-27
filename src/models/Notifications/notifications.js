const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: ['order', 'promo', 'system'],
    default: 'order',
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  deliveryBoyId: {
    type: Schema.Types.ObjectId,
    ref: 'DeliveryBoy',
  },
  hotelId: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
  },
}, { timestamps: true });

module.exports = mongoose.model('CustomNotification', notificationSchema);
