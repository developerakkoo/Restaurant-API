const { Schema, model } = require("mongoose");

const deliveryChargesSchema = new Schema(
    {
        range1Price: {
            type: Number,
            required: true,
        },
        range1MinKm: {
            type: Number,
            required: true,
        },
        range1MaxKm: {
            type: Number,
            required: true,
        },
        range2Price: {
            type: Number,
            required: true,
        },
        range2MinKm: {
            type: Number,
            required: true,
        },
        range2MaxKm: {
            type: Number,
            required: true,
        },
        range3Price: {
            type: Number,
            required: true,
        },
        range3MinKm: {
            type: Number,
            required: true,
        },
        range3MaxKm: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true },
);

module.exports = model("DeliveryCharges", deliveryChargesSchema);
