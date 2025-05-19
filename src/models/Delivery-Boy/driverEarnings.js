const mongoose = require('mongoose');
const { Schema } = mongoose;

const driverEarningSchema = new Schema({
  driverId: {
    type: Schema.Types.ObjectId,
    ref: 'deliveryBoy',
    required: true,
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  bonus: {
    type: Number,
    default: 0,
  },
  isSettled: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('DriverEarning', driverEarningSchema);
