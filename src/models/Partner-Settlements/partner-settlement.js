const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const partnerSettlementSchema = new Schema(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    dishId: {
      type: Schema.Types.ObjectId,
      ref: "HotelDish",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    partnerPrice: {
      type: Number,
      required: true,
    },
    totalPartnerEarning: {
      type: Number,
      required: true,
    },
    adminEarning: {
      type: Number,
      required: true,
    },
    isSettled: {
      type: Boolean,
      default: false,
    },
    settledAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PartnerSettlement", partnerSettlementSchema);
