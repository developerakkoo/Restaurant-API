const mongoose = require('mongoose');
const { Schema } = mongoose;

const driverSettlementSchema = new Schema({
  driverId: {
    type: Schema.Types.ObjectId,
    ref: 'deliveryBoy',
    required: true,
  },
  settlementDate: {
    type: Date,
    required: true,
  },
  amountPaid: {
    type: Number,
    required: true,
  },
  ordersSettled: [{
    type: Schema.Types.ObjectId,
    ref: 'DriverEarning',
  }],
  note: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('DriverSettlement', driverSettlementSchema);
