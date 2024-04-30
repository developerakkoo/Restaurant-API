const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        products: [
            {
                dishId: {
                    type: Schema.Types.ObjectId,
                    ref: "HotelDish",
                },
                quantity: {
                    type: Number,
                    default:1
                },
            },
        ],
        totalPrice: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Cart", cartSchema);
