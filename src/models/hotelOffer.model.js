const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const hotelOfferSchema = new Schema(
    {
        hotelId: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        offerType: {
            type: String,
            required: true,
            enum: ["FREE_DELIVERY", "PERCENTAGE_OFF", "FLAT_OFF"],
        },
        offerValue: {
            type: Number,
            required: true,
        },
        minOrderAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        maxDiscount: {
            type: Number,
            required: false,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        description: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

// Index for faster queries
hotelOfferSchema.index({ hotelId: 1, isActive: 1 });
hotelOfferSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model("HotelOffer", hotelOfferSchema); 