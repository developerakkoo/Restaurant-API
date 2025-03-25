const { Schema, model } = require("mongoose");

const pinCodeSchema = new Schema(
    {
        pincode: { type: String, required: true },
        address: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    { timestamps: true },
);

module.exports = model("PinCode", pinCodeSchema);
