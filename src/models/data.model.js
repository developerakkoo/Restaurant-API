const { Schema, model } = require("mongoose");

const dataSchema = new Schema(
    {
        gstPercentage: {
            type: Number,
            required: true,
            default: 0,
        },
        gstIsActive: {
            type: Boolean,
        },
        platformFee: {
            type: Number,
            required: true,
            default: 0,
        },
        deliveryBoyAllowance: {
            type: Number,
        },
        deliveryBoyIncentiveFor16delivery: {
            type: Number,
        },
        deliveryBoyIncentiveFor21delivery: {
            type: Number,
        },
    },
    { timestamps: true },
);

module.exports = model("Data", dataSchema);
