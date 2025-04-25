const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ratingSchema = new Schema(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        dishId: [{
            type: Schema.Types.ObjectId,
            ref: "HotelDish",
            required: true,
        }],
        deliveryBoyId: {
            type: Schema.Types.ObjectId,
            ref: "deliveryBoy",
        },
        foodRating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        deliveryRating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        restaurantRating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        review: {
            type: String,
            trim: true,
        },
        images: [{
            type: String,
        }],
        isAnonymous: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["active", "reported", "deleted"],
            default: "active",
        },
    },
    { timestamps: true }
);

// Indexes for faster queries
ratingSchema.index({ orderId: 1 });
ratingSchema.index({ dishId: 1 });
ratingSchema.index({ deliveryBoyId: 1 });
ratingSchema.index({ userId: 1 });

module.exports = mongoose.model("Rating", ratingSchema); 