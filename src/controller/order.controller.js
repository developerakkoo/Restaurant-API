const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const dishModel = require("../models/hotelDish.model");
const { v4: uuidv4 } = require("uuid");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { responseMessage } = require("../constant");
const dataModel = require("../models/data.model");
const moment = require("moment");
const razorpay = require("razorpay");
const { getIO } = require("../utils/socket");
const promoCodeModel = require("../models/promoCode.model");
const { ApiError } = require("../utils/ApiErrorHandler");
let instance = new razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET,
});
exports.CalculateAmountToPay = asyncHandler(async (req, res) => {
    const data = await dataModel.find();
    if (!data || data.length === 0) {
        return res
            .status(500)
            .json(
                new ApiResponse(
                    500,
                    null,
                    "Server error: Missing configuration data",
                ),
            );
    }

    const { gstPercentage, deliveryCharges, platformFee } = data[0];
    const { userId, code } = req.body;

    // Find the user's cart
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.products.length === 0) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    null,
                    responseMessage.userMessage.emptyCart,
                ),
            );
    }

    // Calculate the subtotal (total product cost)
    const subtotal = (
        await Promise.all(
            cart.products.map(async (product) => {
                const dish = await dishModel.findById(product.dishId);
                return dish.userPrice * product.quantity;
            }),
        )
    ).reduce((total, price) => total + price, 0);

    // Calculate GST
    const gstAmount = (subtotal * gstPercentage) / 100;

    // Calculate the initial total amount to pay
    let totalAmountToPay = subtotal + gstAmount + deliveryCharges + platformFee;

    let discount = 0;
    let promoCodeId = null;
    let promoCodeDetails = null;

    // If a promo code is provided, validate and apply it
    if (code) {
        const promoCode = await promoCodeModel.findOne({ code });
        if (!promoCode || !promoCode.isActive) {
            throw new ApiError(400, "Invalid promo code");
        }
        if (
            moment(promoCode.expiry, "DD-MM-YYYY").isBefore(
                moment(),
                "DD-MM-YYYY",
            )
        ) {
            throw new ApiError(400, "Promo code expired");
        }
        if (subtotal < promoCode.minOrderAmount) {
            throw new ApiError(
                400,
                "Order total needs to be greater than the minimum order amount",
            );
        }

        switch (promoCode.codeType) {
            case 1: // FREE_DELIVERY
                discount = deliveryCharges;
                promoCodeDetails = `FREE_DELIVERY`;
                totalAmountToPay -= deliveryCharges;
                break;
            case 2: // GET_OFF
                discount = promoCode.discountAmount;
                promoCodeDetails = `GET_OFF`;
                totalAmountToPay -= promoCode.discountAmount;
                break;
            case 3: // NEW_USER
                const userOrderExist = await Order.findOne({ userId });
                if (userOrderExist) {
                    throw new ApiError(
                        400,
                        "This code is only valid on the first order",
                    );
                }
                discount = promoCode.discountAmount;
                promoCodeDetails = `NEW_USER `;
                totalAmountToPay -= promoCode.discountAmount;
                break;
            default:
                throw new ApiError(400, "Invalid promo code type");
        }

        promoCodeId = promoCode._id;
    }

    // Adjust totalAmountToPay in case it goes negative
    if (totalAmountToPay < 0) {
        totalAmountToPay = 0;
    }

    // Construct the detailed breakdown
    const breakdown = {
        subtotal,
        gstAmount,
        deliveryCharges:
            promoCodeDetails && promoCodeDetails.startsWith("FREE_DELIVERY")
                ? 0
                : deliveryCharges,
        platformFee,
        discount,
        totalAmountToPay,
        promoCodeId,
        promoCodeDetails,
    };

    // Return the calculated amounts and breakdown
    return res
        .status(200)
        .json(
            new ApiResponse(200, breakdown, "Amount calculated successfully"),
        );
});

exports.placeOrder = asyncHandler(async (req, res) => {
    const { userId, addressId, phone, description, priceDetails, paymentId } =
        req.body;

    // Generate UUIDv4
    const uuid = uuidv4();
    // Convert UUID to uppercase
    const uppercaseUuid = uuid.toUpperCase();
    // Extract first 6 characters
    const orderIdPrefix = uppercaseUuid.substring(0, 6);

    // Find the user's cart
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.products.length === 0) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    null,
                    responseMessage.userMessage.emptyCart,
                ),
            );
    }

    let hotelId = cart.hotelId.toString();
    const orderId = `${orderIdPrefix}-${hotelId.substring(0, 3).toUpperCase()}`;
    const order = await Order.create({
        orderId,
        userId,
        hotelId: cart.hotelId,
        products: cart.products,
        priceDetails,
        address: addressId,
        promoCode: priceDetails.promoCodeId,
        paymentId,
        phone,
        description,
    });

    getIO.emit(hotelId,{
        message:"Order",
        data: order
    })

    // Clear the cart
    await cart.updateOne({
        $set: {
            products: [],
            totalPrice: 0,
            hotelId: null,
        },
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                order,
                responseMessage.userMessage.ORDER_PLACED_SUCCESSFULLY,
            ),
        );
});

exports.updateOrder = asyncHandler(async (req, res) => {
    const { orderId, status, deliveryBoyId } = req.body;
    const savedOrder = await Order.findById(orderId);
    if (savedOrder.orderStatus === 2 && savedOrder.assignedDeliveryBoy) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    400,
                    null,
                    responseMessage.userMessage.ORDER_ALREADY_ASSIGNED,
                ),
            );
    }
    const order = await Order.findByIdAndUpdate(
        orderId,
        {
            $set: {
                orderStatus: status,
                assignedDeliveryBoy: deliveryBoyId,
            },
        },
        { new: true },
    );
    if (deliveryBoyId) {
        console.log("even");
        getIO().emit(deliveryBoyId, {
            message: "Order assign to you ",
            data: order,
        });
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                order,
                responseMessage.userMessage.ORDER_STATUS_UPDATED_SUCCESSFULLY,
            ),
        );
});

exports.getAllOrders = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const {
        pageNumber = 1,
        pageSize = 10,
        q,
        startDate,
        populate,
        status,
    } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    const skip = (pageNumber - 1) * pageSize;
    // Search based on user query
    if (q) {
        dbQuery = {
            $or: [{ orderId: { $regex: `^${q}`, $options: "i" } }],
        };
    }
    // Sort by date range
    if (startDate) {
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        sDate.setHours(0, 0, 0, 0);
        eDate.setHours(23, 59, 59, 999);
        dbQuery.createdAt = {
            $gte: sDate,
            $lte: eDate,
        };
    }

    //sort by status
    if (status) {
        dbQuery.status = status;
    }

    let orderAggregation = [
        {
            $match: dbQuery,
        },
        // {
        //     $project: { password: 0, refreshToken: 0 }, // Exclude password and refreshToken fields from the result
        // },
        {
            $skip: skip,
        },
        {
            $limit: pageSize,
        },
    ];
    // Conditionally add $lookup stage if populate is true
    if (populate && Number(populate) === 1) {
        orderAggregation.splice(
            1,
            0,
            {
                // Insert $lookup stage after $match
                $lookup: {
                    as: "user",
                    from: "users",
                    foreignField: "_id",
                    localField: "userId",
                    pipeline: [
                        {
                            $project: {
                                name: 1,
                                email: 1,
                                phoneNumber: 1,
                                isOnline: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$user",
                },
            },
            {
                $lookup: {
                    as: "userAddress",
                    from: "useraddresses",
                    foreignField: "_id",
                    localField: "address",
                    pipeline: [
                        {
                            $project: {
                                address: 1,
                                selected: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$userAddress",
                },
            },
            {
                $lookup: {
                    as: "productDetails",
                    from: "hoteldishes",
                    foreignField: "_id",
                    localField: "products.dishId",
                    pipeline: [
                        {
                            $lookup: {
                                from: "categories",
                                localField: "categoryId",
                                foreignField: "_id",
                                as: "categoryDetails",
                                pipeline: [
                                    {
                                        $project: {
                                            name: 1,
                                            image_url: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $unwind: "$categoryDetails",
                        },
                    ],
                },
            },
        );
    }
    const dataCount = await Order.countDocuments(dbQuery);
    const orders = await Order.aggregate(orderAggregation);
    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + orders.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                content: orders,
                startItem,
                endItem,
                totalPages,
                pagesize: orders.length,
                totalDoc: dataCount,
            },
            responseMessage.userMessage.ORDER_FETCHED_SUCCESSFULLY,
        ),
    );
});

exports.getOrderByOrderId = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                order,
                responseMessage.userMessage.ORDER_FETCHED_SUCCESSFULLY,
            ),
        );
});

exports.getAllOrdersByDeliveryBoyId = asyncHandler(async (req, res) => {
    const { deliveryBoyId } = req.params;
    const orders = await Order.find({ assignedDeliveryBoy: deliveryBoyId });
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                orders,
                responseMessage.userMessage.ORDER_FETCHED_SUCCESSFULLY,
            ),
        );
});

exports.getOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await Order.findById(id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                order,
                responseMessage.userMessage.ORDER_FETCHED_SUCCESSFULLY,
            ),
        );
});

exports.deleteOrderById = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const order = await Order.findByIdAndDelete(orderId);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                order,
                responseMessage.userMessage.ORDER_DELETED_SUCCESSFULLY,
            ),
        );
});

exports.getOrdersByUserId = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const orders = await Order.find({ userId });
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                orders,
                responseMessage.userMessage.ORDER_FETCHED_SUCCESSFULLY,
            ),
        );
});

exports.initiatePayment = asyncHandler(async (req, res, next) => {
    const { amount } = req.body;
    if (!amount) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    null,
                    responseMessage.userMessage.AMOUNT_REQUIRED_FOR_PAYMENT,
                ),
            );
    }
    let options = {
        amount: amount,
        currency: "INR",
    };
    instance.orders.create(options, function (err, order) {
        console.log("ORDER: " + order);
        if (err) {
            return res.status(400).json(new ApiResponse(40, null, err.message));
        }
        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    order,
                    responseMessage.userMessage.PAYMENT_INITIATED_SUCCESSFULLY,
                ),
            );
    });
});
