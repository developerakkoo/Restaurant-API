const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const dishStarSchema = new Schema(
    {
        dishId: {
            type: Schema.Types.ObjectId,
            ref: "HotelDish",
            required: true,
        },
        description: {
            type: String,
            required: true,
            default: null,
        },
        star: {
            type: Number,
            required: true,
            default: 0,
            enum: [1, 2, 3, 4], // pending, approved, rejected
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("dishStar", dishStarSchema);
