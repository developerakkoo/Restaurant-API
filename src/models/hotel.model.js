const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const hotelSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "Partner",
            required: true,
        },
        category: [
            {
                type: Schema.Types.ObjectId,
                ref: "Category",
                required: true,
            },
        ],
        hotelName: {
            type: String,
            required: true,
        },
        image_url: {
            type: String,
            required: true,
            default: "_",
        },
        local_imagePath: {
            type: String,
            required: true,
            default: "_",
        },
        address: {
            type: String,
            required: true,
        },
        isTop: {
            type: Number,
            required: true,
            default: 0,
            enum: [0, 1], // 0 for not top; 1 for top
        },
        hotelStatus: {
            type: Number,
            required: true,
            default: 0,
            enum: [0, 1, 2], // pending, approved, rejected
        },
    },
    { timestamps: true },
);

hotelSchema.index({ hotelName: "text" });
module.exports = mongoose.model("Hotel", hotelSchema);
