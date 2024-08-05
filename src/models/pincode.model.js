const { Schema, model } = require("mongoose");

const pinCodeSchema = new Schema(
    {
        pinCode: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true },
);

module.exports = model("PinCode", pinCodeSchema);
