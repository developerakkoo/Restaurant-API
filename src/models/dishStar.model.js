const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const dishStarSchema = new Schema(
    {
        dishId: {
            type: Schema.Types.ObjectId,
            ref: "HotelDish",
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
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
            enum: [1, 2, 3, 4, 5],
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("dishStar", dishStarSchema);
