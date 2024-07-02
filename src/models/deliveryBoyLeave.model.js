const { Schema, model } = require("mongoose");

const LeaveSchema = new Schema(
    {
        deliveryBoyId: {
            type: Schema.Types.ObjectId,
            ref: "DeliveryBoy",
            required: true,
        },
        startDate: {
            type: String,
            required: true,
        },
        endDate: {
            type: String,
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        status: {
            type: Number,
            enum: [0, 1, 2], // pending , approved , rejected
            default: 0,
        },
    },
    { timestamps: true },
);

module.exports = model("deliveryBoyLeave", LeaveSchema);
