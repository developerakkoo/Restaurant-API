const { Schema, model } = require("mongoose");

const deliveryBoyEarnings = new Schema(
    {
        deliveryBoyId: {
            type: Schema.Types.ObjectId,
            ref: "DeliveryBoy",
            required: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: true,
        },
        earningsPerOrder: {
            type: Number,
            required: true,
            default: 0,
        },
        totalCommissionRate: {
            type: Number,
            required: true,
            default: 0,
        },
        totalEarnings: {
            type: Number,
            required: true,
            default: 0,
        },
        isPaid: {
            type: Boolean,
            required: true,
            default: 0,
        },
    },
    { timestamps: true },
);

// Define the schema for distance-based pricing
const pricingSchema = new Schema({
    minDistance: {
        type: Number,
        required: true,
        min: 0,
    },
    maxDistance: {
        type: Number,
        required: true,
        min: 0,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
});

module.exports = model("DeliveryBoyEarningsKmBasedPricing", pricingSchema);

module.exports = model("DeliveryBoyEarnings", deliveryBoyEarnings);
