const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const { v4: uuidv4 } = require("uuid");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { responseMessage } = require("../constant");
const moment = require("moment");
const razorpay = require("razorpay");
const { getIO } = require("../utils/socket");
let instance = new razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET,
});

exports.placeOrder = asyncHandler(async (req, res) => {
    const {
        userId,
        hotelId,
        addressId,
        promoCode,
        totalPrice,
        paymentId,
        phone,
        deliveryCharge,
        gst,
        description,
    } = req.body;
    // Generate UUIDv4
    const uuid = uuidv4();

    // Convert UUID to uppercase
    const uppercaseUuid = uuid.toUpperCase();

    // Extract first 6 characters
    const orderId = uppercaseUuid.substring(0, 6);
    const cart = await Cart.findOne({ userId });
    if (cart.products.length === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    400,
                    null,
                    responseMessage.userMessage.emptyCart,
                ),
            );
    }
    const order = await Order.create({
        orderId,
        userId,
        hotelId,
        products: cart.products,
        price: cart.totalPrice,
        address: addressId,
        promoCode,
        totalPrice,
        paymentId,
        phone,
        deliveryCharge,
        gst,
        description,
    });
    await cart.updateOne({
        $set: {
            products: [],
            totalPrice: 0,
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
            return res
                .status(400)
                .json(new ApiResponse(40, null, error.message));
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
