const mongoose = require('mongoose');
const { Schema } = mongoose;

const driverSettingsSchema = new Schema({
  perDeliveryAmount: {
    type: Number,
    required: true,
  },
  bonus16thDelivery: {
    type: Number,
    required: true,
  },
  bonus21stDelivery: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('DriverSettings', driverSettingsSchema);
