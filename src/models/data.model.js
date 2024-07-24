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
    },
    { timestamps: true },
);

module.exports = model("Data", dataSchema);
