const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema(
    {
        orderId: {
            type: String,
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        hotelId: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        assignedDeliveryBoy: {
            type: Schema.Types.ObjectId,
            ref: "deliveryBoy",
        },
        address: {
            type: Schema.Types.ObjectId,
            ref: "UserAddress",
            required: true,
        },
        promoCode: {
            type: Schema.Types.ObjectId,
            ref: "PromoCode",
        },
        products: [
            {
                dishId: {
                    type: Schema.Types.ObjectId,
                    ref: "HotelDish",
                },
                quantity: {
                    type: Number,
                },
            },
        ],
        price: {
            type: Number,
            required: true,
        },
        deliveryCharge: {
            type: Number,
            required: true,
        },
        gst:{
            type: Number,
            required: true,
        },
        totalPrice: {
            type: Number,
            required: true,
        },
        paymentId: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        orderStatus: {
            type: Number,
            required: true,
            default: 0,
            enum: [0, 1, 2, 3], // received =0 being prepared = 1 , delivery assigned = 2, delivery =3
        },
    },
    { timestamps: true },
);


module.exports = mongoose.model("Order", orderSchema);
