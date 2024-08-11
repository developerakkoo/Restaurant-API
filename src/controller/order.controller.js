const deliveryChargesModel = require("../models/deliveryCharges.model");
const { sendNotification } = require("./notification.controller");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { getDistance } = require("../utils/getDistance.utils");
const promoCodeModel = require("../models/promoCode.model");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const dishModel = require("../models/hotelDish.model");
const hotelModel = require("../models/hotel.model");
const { responseMessage } = require("../constant");
const dataModel = require("../models/data.model");
const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const { getIO } = require("../utils/socket");
const { v4: uuidv4 } = require("uuid");
const { Readable } = require("stream");
const { Types } = require("mongoose");
const PDFDocument = require("pdfkit");
const razorpay = require("razorpay");
const moment = require("moment");
const path = require("path");
const fs = require("fs");
const {
    generateHeader,
    generateFooter,
    generateInvoiceTable,
    generateCustomerInformation,
} = require("../utils/invoice");
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

    const { gstPercentage, gstIsActive, deliveryBoyAllowance } = data[0];
    const { userId, code, userLat, userLong, shopLat, shopLong } = req.body;

    // Find the user's cart
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.products.length === 0) {
        return res
            .status(400)
            .json(new ApiResponse(400, null, "Your cart is empty."));
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
    let gstAmount = 0;
    if (gstIsActive) {
        gstAmount = (subtotal * gstPercentage) / 100;
    }

    // Calculate the distance using Google Maps API
    let distanceInKm;
    try {
        distanceInKm = await getDistance(userLat, userLong, shopLat, shopLong);
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, null, error.message));
    }

    // Fetch delivery charges from the database
    const deliveryChargesConfig = await deliveryChargesModel.findOne();
    let deliveryCharges = 0;
    let deliveryBoyCompensationAmount = 0;

    if (
        distanceInKm >= deliveryChargesConfig.range1MinKm &&
        distanceInKm <= deliveryChargesConfig.range1MaxKm
    ) {
        deliveryCharges = deliveryChargesConfig.range1Price;
        deliveryBoyCompensationAmount = deliveryChargesConfig.range1Price;
    } else if (
        distanceInKm > deliveryChargesConfig.range2MinKm &&
        distanceInKm <= deliveryChargesConfig.range2MaxKm
    ) {
        deliveryCharges = deliveryChargesConfig.range2Price;
        deliveryBoyCompensationAmount = deliveryChargesConfig.range2Price;
    } else if (
        distanceInKm > deliveryChargesConfig.range3MinKm &&
        distanceInKm <= deliveryChargesConfig.range3MaxKm
    ) {
        deliveryCharges = deliveryChargesConfig.range3Price;
        deliveryBoyCompensationAmount = deliveryChargesConfig.range3Price;
    } else {
        deliveryCharges = deliveryChargesConfig.range3Price;
        deliveryBoyCompensationAmount = deliveryChargesConfig.range3Price;
    }
    if (subtotal >= 500) {
        deliveryCharges = 0; // Free delivery for orders above 500
    }

    // Calculate platform fee as a percentage of the subtotal
    const platformFee = (subtotal * data[0].platformFee) / 100;

    // Calculate the initial total amount to pay
    let totalAmountToPay = subtotal + gstAmount + deliveryCharges + platformFee;

    let discount = 0;
    let promoCodeId = null;
    let promoCodeDetails = null;
    let promoCodeData;
    let deliveryBoyCompensation = 0;

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
                promoCodeDetails = "FREE_DELIVERY";
                totalAmountToPay -= deliveryCharges;
                break;
            case 2: // GET_OFF
                discount = promoCode.discountAmount;
                promoCodeDetails = "GET_OFF";
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
                promoCodeDetails = "NEW_USER";
                totalAmountToPay -= promoCode.discountAmount;
                break;
            default:
                throw new ApiError(400, "Invalid promo code type");
        }

        promoCodeId = promoCode._id;
        promoCodeData = promoCode;
    }

    // Adjust totalAmountToPay in case it goes negative
    if (totalAmountToPay < 0) {
        totalAmountToPay = 0;
    }
    // Round the total amount to the nearest integer
    const roundedAmount = Math.ceil(totalAmountToPay);

    // Calculate the round-off value
    const roundOffValue = roundedAmount - totalAmountToPay;

    // Construct the detailed breakdown
    const breakdown = {
        subtotal,
        gstAmount,
        distanceInKm,
        deliveryCharges:
            promoCodeDetails && promoCodeDetails.startsWith("FREE_DELIVERY")
                ? 0
                : deliveryCharges,
        platformFee,
        discount,
        total: Number(totalAmountToPay.toFixed(2)),
        roundOffValue: Number(roundOffValue.toFixed(2)),
        totalAmountToPay: roundedAmount,
        promoCodeId,
        promoCodeDetails: promoCodeData,
        deliveryBoyCompensation:
            deliveryBoyCompensationAmount + deliveryBoyAllowance,
    };

    // Return the calculated amounts and breakdown
    return res
        .status(200)
        .json(
            new ApiResponse(200, breakdown, "Amount calculated successfully"),
        );
});

exports.placeOrder = asyncHandler(async (req, res) => {
    const {
        userId,
        addressId,
        phone,
        description,
        priceDetails,
        paymentId,
        paymentMode,
    } = req.body;

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
        paymentMode,
        phone,
        description,
        orderTimeline: [
            {
                title: "Order Placed",
                status: "PENDING",
                dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
            },
        ],
    });
    const hotel = await hotelModel.findOne({ _id: cart.hotelId });
    sendNotification(hotel.userId, "New Order", order); // send notification to hotel owner

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

exports.acceptOrder = asyncHandler(async (req, res) => {
    const { orderId, status } = req.body;
    let message;

    const update = {
        $set: {
            orderStatus: status,
        },
    };

    if (status === 4) {
        message = "ORDER_ACCEPTED_SUCCESSFULLY";
        update.$push = {
            orderTimeline: {
                title: "Order Accepted",
                dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
                status: "ACCEPTED",
            },
        };
    } else if (status === 5) {
        message = "ORDER_REJECTED_SUCCESSFULLY";
        update.$push = {
            orderTimeline: {
                title: "Order Rejected",
                dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
                status: "REJECTED",
            },
        };
    }

    const order = await Order.findByIdAndUpdate(orderId, update, { new: true });

    if (!order) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Order not found"));
    }

    sendNotification(order.userId, message, order);

    return res.status(200).json(new ApiResponse(200, order, message));
});

exports.sendOrderToAllDeliveryBoy = asyncHandler(async (req, res) => {
    const { orderId, deliveryBoyIds } = req.body;

    // Validate input
    if (
        !orderId ||
        !Array.isArray(deliveryBoyIds) ||
        deliveryBoyIds.length === 0
    ) {
        return res
            .status(400)
            .json(new ApiResponse(400, null, "Invalid input"));
    }

    // Find and update the order
    const order = await Order.findByIdAndUpdate(
        orderId,
        {
            $set: {
                orderStatus: 2,
                assignedDeliveryBoy: null,
            },
        },
        { new: true },
    );

    if (!order) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Order not found"));
    }

    // Send notifications to all delivery boys
    await Promise.all(
        deliveryBoyIds.map(async (deliveryBoyId) => {
            try {
                await sendNotification(
                    deliveryBoyId,
                    "New Order. Accept it fast to start delivering this order.",
                    order,
                );
            } catch (notificationError) {
                console.error(
                    `Failed to send notification to delivery boy ${deliveryBoyId}:`,
                    notificationError,
                );
            }
        }),
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                order,
                "Notification sent successfully to all delivery boys",
            ),
        );
});

exports.updateOrder = asyncHandler(async (req, res) => {
    const { orderId, status, deliveryBoyId, paymentMode } = req.body;
    const savedOrder = await Order.findById(orderId);
    let url;

    if (paymentMode === "UPI") {
        if (!req.file) throw new ApiError(400, "Payment photo is required");
        const { filename } = req.file;
        url = `https://${req.hostname}/upload/${filename}`;
    }

    // Check if the order is already assigned and trying to assign again
    if (
        savedOrder.orderStatus === 2 &&
        savedOrder.assignedDeliveryBoy &&
        req.body.deliveryBoyId
    ) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    null,
                    responseMessage.userMessage.ORDER_ALREADY_ASSIGNED,
                ),
            );
    }

    const update = {
        $set: {
            orderStatus: status,
            assignedDeliveryBoy: deliveryBoyId,
            paymentMode: paymentMode,
            upi_paymentScreenShot: url,
        },
    };

    // Prepare timeline entry based on status
    let timelineEntry = {};
    switch (Number(status)) {
        case 1:
            timelineEntry = {
                title: "Order being prepared",
                dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
                status: "PREPARING",
            };
            break;
        case 2:
            timelineEntry = {
                title: "Delivery assigned",
                dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
                status: "ASSIGNED",
            };
            break;
        case 6:
            timelineEntry = {
                title: "Confirm Pickup",
                dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
                status: "PICKUP_CONFIRMED",
            };
            break;
        case 3:
            timelineEntry = {
                title: "Order delivered",
                dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
                status: "DELIVERED",
            };
            break;
        default:
            break;
    }

    if (timelineEntry.title) {
        update.$push = { orderTimeline: timelineEntry };
    }

    // Update order status and other details
    const order = await Order.findByIdAndUpdate(orderId, update, { new: true });

    if (deliveryBoyId && status === 3) {
        // Fetch today's orders for the delivery boy
        const todayStart = moment().startOf('day').toDate();
        const todayEnd = moment().endOf('day').toDate();
        
        const deliveryBoyOrders = await Order.find({
            assignedDeliveryBoy: deliveryBoyId,
            orderStatus: 3, // Delivered status
            createdAt: { $gte: todayStart, $lte: todayEnd }
        });

        const deliveryCount = deliveryBoyOrders.length;

        const data = await Data.findOne(); // Fetching incentive data
        let incentive = 0;

        if (deliveryCount >= 21) {
            incentive = data.deliveryBoyIncentiveFor21delivery || 200; // Default to 200 if not set
        } else if (deliveryCount >= 16) {
            incentive = data.deliveryBoyIncentiveFor16delivery || 100; // Default to 100 if not set
        }

        if (incentive > 0) {
            await Order.updateMany(
                { assignedDeliveryBoy: deliveryBoyId, orderStatus: 3 },
                { $set: { deliveryBoyIncentive: incentive } }
            );
        }

        // Send notifications to delivery boy and others
        const hotel = await hotelModel.findById(order.hotelId);
        sendNotification(hotel.userId, "Order pick up confirm", order);
        sendNotification(deliveryBoyId, "Order assigned to you", order);
        sendNotification(order.userId, "Delivery boy assigned to your order", order);

        if (status === 3) {
            sendNotification(savedOrder.userId, "Order delivered", order);
        }
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
        hotelId,
    } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    const skip = (Number(pageNumber) - 1) * Number(pageSize);
    // Search based on user query
    if (q) {
        dbQuery = {
            $or: [{ orderId: { $regex: `^${q}`, $options: "i" } }],
        };
    }
    if (hotelId) {
        dbQuery = {
            hotelId: new Types.ObjectId(hotelId),
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
        dbQuery.orderStatus = Number(status);
    }

    let orderAggregation = [
        {
            $match: dbQuery,
        },
        {
            $sort: { createdAt: -1 }, // Sort by createdAt field in descending order (latest first)
        },
        // {
        //     $project: { password: 0, refreshToken: 0 }, // Exclude password and refreshToken fields from the result
        // },
        {
            $skip: skip,
        },
        {
            $limit: Number(pageSize),
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
    const order = await Order.findOne({ orderId })
        .populate({
            path: "hotelId",
            select: "-createdAt -updatedAt -__v",
        })
        .populate({
            path: "products.dishId",
            select: "-createdAt -updatedAt -__v",
        })
        .populate({
            path: "promoCode",
            select: "-createdAt -updatedAt -__v",
        });
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
    let dbQuery = {
        assignedDeliveryBoy: deliveryBoyId,
    };
    if (req.query.status) {
        dbQuery.orderStatus = req.query.status;
    }
    const orders = await Order.find(dbQuery)
        .populate({ path: "userId", select: "name phoneNumber" })
        .populate({
            path: "hotelId",
            select: "-createdAt -updatedAt -__v",
        })
        .populate({
            path: "products.dishId",
            select: "-createdAt -updatedAt -__v",
        })
        .populate({
            path: "promoCode",
            select: "-createdAt -updatedAt -__v",
        })
        .sort({ createdAt: -1 });
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
    const order = await Order.findById(id)
        .populate({
            path: "hotelId",
            select: "-createdAt -updatedAt -__v",
        })
        .populate({
            path: "products.dishId",
            select: "-createdAt -updatedAt -__v",
        })
        .populate({
            path: "promoCode",
            select: "-createdAt -updatedAt -__v",
        });
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
    const orders = await Order.find({ userId })
        .populate({
            path: "hotelId",
            select: "-createdAt -updatedAt -__v",
        })
        .populate({
            path: "products.dishId",
            select: "-createdAt -updatedAt -__v",
        })
        .populate({
            path: "promoCode",
            select: "-createdAt -updatedAt -__v",
        });
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

// Invoice controller
exports.generateInvoice = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const doc = new PDFDocument({ margin: "40" });
    const orderData = await Order.findById(orderId)
        .populate({
            path: "userId",
            select: "name",
        })
        .populate({ path: "address", select: "address" })
        .populate({
            path: "products.dishId",
            select: "name userPrice",
        })
        .select("priceDetails userId address products");

    const items = orderData.products.map((product) => {
        return {
            item: product.dishId.name,
            quantity: product.quantity,
            amount: product.dishId.userPrice,
        };
    });
    const data = {
        name: orderData.userId.name,
        address: orderData.address.address,
        country: "India",
        items,
        subtotal: orderData.priceDetails.subtotal,
        platformFee: orderData.priceDetails.platformFee,
        deliveryCharges: orderData.priceDetails.deliveryCharges,
        gst: orderData.priceDetails.gstAmount,
        total: orderData.priceDetails.totalAmountToPay,
    };
    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${Date.now()}.pdf`,
    );

    // Pipe the PDF to the response
    doc.pipe(res);

    // Generate PDF content
    generateHeader(doc);
    generateCustomerInformation(doc, data);
    generateInvoiceTable(doc, data);
    generateFooter(doc);

    // Finalize the PDF and end the stream
    doc.end();
});
