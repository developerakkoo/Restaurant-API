const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const orderSchema = new Schema(
    {
        orderId: {
            type: String,
            required: true,
        },
        otp: {
            type: String,
            required: false,
            unique: true,
            
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
        priceDetails: {
            subtotal: {
                type: Number,
                required: true,
            },
            gstAmount: {
                type: Number,
                required: true,
            },
            deliveryCharges: {
                type: Number,
                required: true,
            },
            deliveryBoyCompensation: {
                type: Number,
                required: true,
            },
            platformFee: {
                type: Number,
                required: true,
            },
            discount: {
                type: Number,
                required: true,
            },
            total: {
                type: Number,
                required: true,
            },
            roundOffValue: {
                type: Number,
                required: true,
            },
            totalAmountToPay: {
                type: Number,
                required: true,
            },
        },
        paymentId: {
            type: String,
        },
        invoiceUrl: {
            type: String,
        },
        paymentMode: {
            type: String,
            required: true,
            enum: ["COD", "CASH", "UPI", "RAZORPAY"],
        },
        upi_paymentScreenShot: {
            type: String,
        },
        phone: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        is16delivery: {
            type: Boolean,
        },
        is21delivery: {
            type: Number,
        },
        deliveryBoyIncentive: {
            type: Number,
            default: 0,
        },
        compensationPaidToDeliveryBoy: {
            type: Boolean,
            required: true,
            default: false,
        },
        compensationPaidToHotelPartner: {
            type: Boolean,
            required: true,
            default: false,
        },
        orderTimeline: {
            type: [
                {
                    title: String,
                    dateTime: String,
                    status: String,
                },
            ],
        },
        orderStatus: {
            type: Number,
            required: true,
            default: 0,
            enum: [0, 1, 2, 3, 4, 5, 6,7], // received = 0, being prepared = 1, delivery assigned = 2, delivered = 3, accepted = 4, cancel order by hotel = 5, pickup confirmed = 6, cancelled by customer = 7
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
