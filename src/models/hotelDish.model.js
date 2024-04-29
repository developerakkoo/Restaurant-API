const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const dishSchema = new Schema(
    {
        hotelId: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        name: {
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
        dishType: {
            type: String,
            required: true,
            enum: ["veg", "non-veg"],
        },
        partnerPrice: {
            type: Number,
            required: true,
        },
        userPrice: {
            type: Number,
            required: true,
            default: 0,
        },
        spicLevel: {
            type: Number,
            required: true,
            default: 0,
            enum: [0, 1, 3], // no-spicey, medium-spicey, so-spicey
        },
        stock: {
            type: Number,
            required: true,
            default: 1,
            enum: [0, 1], // out of stock, available
        },
        status: {
            type: Number,
            required: true,
            default: 0,
            enum: [0, 1, 2, 3], // pending,blocked, approved, rejected,
        },
    },
    { timestamps: true },
);

dishSchema.index({ name: "text" });
module.exports = mongoose.model("HotelDish", dishSchema);

