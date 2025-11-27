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
const Data = require("../models/data.model");
const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const DeliverBoy = require("../models/deliveryBoy.model");
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
const { createSettlement } = require("./Partner-Settlement/partner-settlement");
const { createEarningInternal } = require("./Delivery-Boy/delivery-boy-earnings");


let instance = new razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET,
});

/**
 * Generates a random 6-digit OTP
 * @returns {string} A 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};



exports.cancelOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).json(new ApiResponse(404, null, "Order not found"));
    }

    const oldStatus = order.orderStatus;
    order.orderStatus = 7; // Cancelled status
    
    // Add timeline entry
    order.orderTimeline.push({
        title: "Order Cancelled",
        dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
        status: "CANCELLED_BY_CUSTOMER",
    });
    
    await order.save();

    // Populate order for socket events
    const populatedOrder = await Order.findById(orderId)
        .populate({
            path: "hotelId",
            select: "hotelName address phoneNumber userId",
        })
        .populate({
            path: "userId",
            select: "name phoneNumber",
        })
        .populate({
            path: "address",
            select: "address location",
        })
        .populate({
            path: "products.dishId",
            select: "dishName userPrice partnerPrice",
        });

    const io = getIO();

    // Emit generic orderStatusUpdate event
    const statusUpdatePayload = {
        type: "ORDER_STATUS_UPDATE",
        orderId: order.orderId,
        order: populatedOrder || order,
        oldStatus: oldStatus,
        newStatus: 7,
        timestamp: new Date(),
    };

    io.to(`user_${order.userId}`).emit("orderStatusUpdate", statusUpdatePayload);
    io.to("admin_dashboard").emit("orderStatusUpdate", statusUpdatePayload);

    // Emit orderCancelled event
    const cancelledPayload = {
        type: "ORDER_CANCELLED",
        orderId: order.orderId,
        order: populatedOrder || order,
        cancelledBy: "customer",
        timestamp: new Date(),
    };

    io.to(`user_${order.userId}`).emit("orderCancelled", cancelledPayload);
    io.to("admin_dashboard").emit("orderCancelled", cancelledPayload);

    // Notify partner if hotel exists
    const hotel = await hotelModel.findById(order.hotelId);
    if (hotel && hotel.userId) {
        io.to(`partner_${hotel.userId}`).emit("orderStatusUpdate", statusUpdatePayload);
        io.to(`partner_${hotel.userId}`).emit("orderCancelled", cancelledPayload);
    }

    return res.status(200).json(new ApiResponse(200, order, "Order cancelled successfully"));
});

exports.rejectOrderByDeliveryBoy = asyncHandler(async (req, res) => {
    const { orderId, deliveryBoyId, reason } = req.body;
    
    // Input validation
    if (!orderId) {
        return res.status(400).json(
            new ApiResponse(400, null, "Order ID is required")
        );
    }

    if (!deliveryBoyId) {
        return res.status(400).json(
            new ApiResponse(400, null, "Delivery boy ID is required")
        );
    }

    if (!Types.ObjectId.isValid(orderId)) {
        return res.status(400).json(
            new ApiResponse(400, null, "Invalid order ID format")
        );
    }

    if (!Types.ObjectId.isValid(deliveryBoyId)) {
        return res.status(400).json(
            new ApiResponse(400, null, "Invalid delivery boy ID format")
        );
    }

    // Validate reason length (max 500 characters)
    if (reason && reason.length > 500) {
        return res.status(400).json(
            new ApiResponse(400, null, "Reason cannot exceed 500 characters")
        );
    }

    // Find the order
    const order = await Order.findById(orderId).populate('hotelId');
    if (!order) {
        return res.status(404).json(
            new ApiResponse(404, null, "Order not found")
        );
    }

    // Verify delivery boy exists
    const deliveryBoy = await DeliverBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
        return res.status(404).json(
            new ApiResponse(404, null, "Delivery boy not found")
        );
    }

    // Check if the order is assigned to this delivery boy
    if (!order.assignedDeliveryBoy || 
        order.assignedDeliveryBoy.toString() !== deliveryBoyId.toString()) {
        return res.status(403).json(
            new ApiResponse(403, null, "This order is not assigned to you")
        );
    }

    // Check if order status allows rejection (only if delivery assigned or pickup confirmed)
    if (![2, 6].includes(order.orderStatus)) {
        return res.status(400).json(
            new ApiResponse(400, null, "Order cannot be rejected at this stage. Only orders with status 'assigned' (2) or 'pickup confirmed' (6) can be rejected.")
        );
    }

    // Update order status to rejected by delivery boy
    // Use atomic update to remove delivery boy from assignedDeliveryBoys array and clear assignedDeliveryBoy
    const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
            $set: {
                orderStatus: 8,
                assignedDeliveryBoy: null,
            },
            $pull: {
                assignedDeliveryBoys: deliveryBoyId
            },
            $push: {
                orderTimeline: {
                    title: "Order Rejected by Delivery Boy",
                    dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
                    status: "REJECTED_BY_DELIVERY_BOY",
                    reason: reason || "No reason provided"
                }
            }
        },
        { new: true }
    );
    
    if (!updatedOrder) {
        return res.status(400).json(
            new ApiResponse(400, null, "Failed to reject order")
        );
    }
    
    // Populate the updated order for subsequent operations
    const populatedUpdatedOrder = await Order.findById(updatedOrder._id)
        .populate('hotelId');

    const io = getIO();

    // Send Socket.IO notifications
    io.to(`deliveryBoy_${deliveryBoyId}`).emit("orderRejected", {
        type: "ORDER_REJECTED",
        orderId: populatedUpdatedOrder.orderId,
        order: populatedUpdatedOrder,
        reason: reason || "No reason provided",
        timestamp: new Date(),
    });

    // Notify hotel/partner
    if (populatedUpdatedOrder.hotelId && populatedUpdatedOrder.hotelId.userId) {
        const partnerId = populatedUpdatedOrder.hotelId.userId;
        sendNotification(
            partnerId, 
            "Order Rejected by Delivery Boy", 
            `Order ${populatedUpdatedOrder.orderId} was rejected by delivery boy. Reason: ${reason || "No reason provided"}`
        );
        
        io.to(`partner_${partnerId}`).emit("orderRejectedByDeliveryBoy", {
            type: "ORDER_REJECTED_BY_DELIVERY_BOY",
            orderId: populatedUpdatedOrder.orderId,
            order: populatedUpdatedOrder,
            deliveryBoyId: deliveryBoyId,
            deliveryBoyName: `${deliveryBoy.firstName} ${deliveryBoy.lastName}`,
            reason: reason || "No reason provided",
            timestamp: new Date(),
        });
    }

    // Populate order for customer notification
    const populatedOrderForCustomer = await Order.findById(populatedUpdatedOrder._id)
        .populate({
            path: "hotelId",
            select: "hotelName address phoneNumber userId",
        })
        .populate({
            path: "userId",
            select: "name phoneNumber",
        })
        .populate({
            path: "address",
            select: "address location",
        })
        .populate({
            path: "products.dishId",
            select: "dishName userPrice partnerPrice",
        });

    // Emit orderStatusUpdate to customer
    const oldStatus = order.orderStatus; // Preserve old status from original order
    io.to(`user_${populatedOrderForCustomer.userId}`).emit("orderStatusUpdate", {
        type: "ORDER_STATUS_UPDATE",
        orderId: populatedOrderForCustomer.orderId,
        order: populatedOrderForCustomer,
        oldStatus: oldStatus,
        newStatus: 8, // Rejected by delivery boy
        timestamp: new Date(),
    });

    // Emit orderRejectedByDeliveryBoy to customer
    io.to(`user_${populatedOrderForCustomer.userId}`).emit("orderRejectedByDeliveryBoy", {
        type: "ORDER_REJECTED_BY_DELIVERY_BOY",
        orderId: populatedOrderForCustomer.orderId,
        order: populatedOrderForCustomer,
        deliveryBoyId: deliveryBoyId,
        deliveryBoyName: `${deliveryBoy.firstName} ${deliveryBoy.lastName}`,
        reason: reason || "No reason provided",
        timestamp: new Date(),
    });

    // Notify customer
    sendNotification(
        populatedOrderForCustomer.userId,
        "Delivery Boy Rejected Order",
        `Your order ${populatedOrderForCustomer.orderId} was rejected by the assigned delivery boy. We'll assign a new delivery partner soon.`
    );

    // Notify admin dashboard
    io.to("admin_dashboard").emit("orderRejectedByDeliveryBoy", {
        type: "ORDER_REJECTED_BY_DELIVERY_BOY",
        orderId: populatedOrderForCustomer.orderId,
        deliveryBoyId: deliveryBoyId,
        deliveryBoyName: `${deliveryBoy.firstName} ${deliveryBoy.lastName}`,
        reason: reason || "No reason provided",
        timestamp: new Date(),
        hotelId: populatedOrderForCustomer.hotelId?._id || populatedOrderForCustomer.hotelId,
        userId: populatedOrderForCustomer.userId
    });

    return res.status(200).json(
        new ApiResponse(200, populatedOrderForCustomer, "Order rejected successfully")
    );
});

exports.CalculateAmountToPay = asyncHandler(async (req, res) => {
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
        hotelId,
        products
    } = req.body;

    // Generate UUIDv4
    const uuid = uuidv4();
    // Convert UUID to uppercase
    const uppercaseUuid = uuid.toUpperCase();
    // Extract first 6 characters
    const orderIdPrefix = uppercaseUuid.substring(0, 6);

    // Generate OTP for order verification
    const otp = generateOTP();

    const orderId = `${orderIdPrefix}-${hotelId.substring(0, 3).toUpperCase()}`;
    const order = await Order.create({
        orderId,
        otp, // Add OTP to order
        userId,
        hotelId: hotelId,
        products: products,
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

    //Send Notifications To User About Order is Placed
    
    // Get hotel details to find the partner
    const hotel = await hotelModel.findById(hotelId).populate({
        path: "userId",
        select: "name phoneNumber"
    });

    if (hotel && hotel.userId) {
        const partnerId = hotel.userId._id;
        
        // Populate order details for partner notification
        const populatedOrder = await Order.findById(order._id)
            .populate({
                path: "userId",
                select: "name phoneNumber"
            })
            .populate({
                path: "address",
                select: "address type"
            })
            .populate({
                path: "products.dishId",
                select: "name userPrice"
            });

        // Send Socket.io notification to partner
        const io = getIO();
        
        // Create notification payload for partner
        const partnerNotificationPayload = {
            type: "NEW_ORDER",
            orderId: order.orderId,
            order: populatedOrder,
            timestamp: new Date(),
            message: `New order received: ${order.orderId}`,
            priority: "high",
            customerName: populatedOrder.userId.name,
            customerPhone: populatedOrder.userId.phoneNumber,
            totalAmount: order.priceDetails.totalAmountToPay,
            itemCount: order.products.length
        };

        // Send to specific partner room
        io.to(`partner_${partnerId}`).emit("newOrder", partnerNotificationPayload);
        
        // Also send to admin dashboard for monitoring
        io.to("admin_dashboard").emit("newOrder", {
            ...partnerNotificationPayload,
            partnerId: partnerId,
            partnerName: hotel.userId.name,
            hotelName: hotel.hotelName
        });

        // Emit to customer room
        io.to(`user_${userId}`).emit("newOrder", {
            type: "NEW_ORDER",
            orderId: order.orderId,
            order: populatedOrder,
            timestamp: new Date(),
            message: `Your order ${order.orderId} has been placed successfully`,
            status: 0, // Received status
        });

        // NOTE: Orders are NOT broadcasted to all delivery boys when placed
        // Orders will only be visible to delivery boys when admin assigns them
        // This prevents all delivery boys from seeing unassigned orders
        
        console.log(`New order notification sent to partner: ${partnerId}`);
        console.log(`New order notification sent to customer: ${userId}`);
        console.log(`Order placed: ${order.orderId} for hotel: ${hotel.hotelName}`);
        console.log(`Order will be visible to delivery boys only after admin assignment`);
    }
    
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

    const order = await Order.findByIdAndUpdate(orderId, update, { new: false });

    if (!order) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Order not found"));
    }

    // Populate order for socket events
    const populatedOrder = await Order.findById(orderId)
        .populate({
            path: "hotelId",
            select: "hotelName address phoneNumber userId",
        })
        .populate({
            path: "userId",
            select: "name phoneNumber",
        })
        .populate({
            path: "address",
            select: "address location",
        })
        .populate({
            path: "products.dishId",
            select: "dishName userPrice partnerPrice",
        });

    const io = getIO();
    const oldStatus = order.orderStatus;

    // Emit generic orderStatusUpdate event
    const statusUpdatePayload = {
        type: "ORDER_STATUS_UPDATE",
        orderId: order.orderId,
        order: populatedOrder || order,
        oldStatus: oldStatus,
        newStatus: status,
        timestamp: new Date(),
    };

    // Emit to customer
    io.to(`user_${order.userId}`).emit("orderStatusUpdate", statusUpdatePayload);

    // Emit to partner if hotel exists
    if (populatedOrder?.hotelId?.userId) {
        io.to(`partner_${populatedOrder.hotelId.userId}`).emit("orderStatusUpdate", statusUpdatePayload);
    }

    // Emit to admin dashboard
    io.to("admin_dashboard").emit("orderStatusUpdate", statusUpdatePayload);

    // Emit specific events based on status
    if (status === 4) {
        // Order accepted
        const acceptedPayload = {
            type: "ORDER_ACCEPTED",
            orderId: order.orderId,
            order: populatedOrder || order,
            timestamp: new Date(),
        };

        io.to(`user_${order.userId}`).emit("orderAccepted", acceptedPayload);
        
        if (populatedOrder?.hotelId?.userId) {
            io.to(`partner_${populatedOrder.hotelId.userId}`).emit("orderAccepted", acceptedPayload);
        }

        io.to("admin_dashboard").emit("orderAccepted", acceptedPayload);
    } else if (status === 5) {
        // Order cancelled by hotel
        const cancelledPayload = {
            type: "ORDER_CANCELLED",
            orderId: order.orderId,
            order: populatedOrder || order,
            cancelledBy: "hotel",
            timestamp: new Date(),
        };

        io.to(`user_${order.userId}`).emit("orderCancelled", cancelledPayload);
        io.to("admin_dashboard").emit("orderCancelled", cancelledPayload);
    } else if (status === 7) {
        // Order cancelled by customer
        const cancelledPayload = {
            type: "ORDER_CANCELLED",
            orderId: order.orderId,
            order: populatedOrder || order,
            cancelledBy: "customer",
            timestamp: new Date(),
        };

        if (populatedOrder?.hotelId?.userId) {
            io.to(`partner_${populatedOrder.hotelId.userId}`).emit("orderCancelled", cancelledPayload);
        }

        io.to("admin_dashboard").emit("orderCancelled", cancelledPayload);
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

/**
 * Accept order by delivery boy
 * When a delivery boy accepts an order, remove other delivery boys from assignedDeliveryBoys
 * and set assignedDeliveryBoy to only this delivery boy
 */
exports.acceptOrderByDeliveryBoy = asyncHandler(async (req, res) => {
    const { orderId, deliveryBoyId } = req.body;

    // Input validation
    if (!orderId) {
        return res.status(400).json(
            new ApiResponse(400, null, "Order ID is required")
        );
    }

    if (!deliveryBoyId) {
        return res.status(400).json(
            new ApiResponse(400, null, "Delivery Boy ID is required")
        );
    }

    if (!Types.ObjectId.isValid(orderId)) {
        return res.status(400).json(
            new ApiResponse(400, null, "Invalid order ID format")
        );
    }

    if (!Types.ObjectId.isValid(deliveryBoyId)) {
        return res.status(400).json(
            new ApiResponse(400, null, "Invalid delivery boy ID format")
        );
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).json(
            new ApiResponse(404, null, "Order not found")
        );
    }

    // Check if order is in assignedDeliveryBoys array (not yet accepted by anyone)
    if (!order.assignedDeliveryBoys || !order.assignedDeliveryBoys.includes(deliveryBoyId)) {
        // Check if already accepted by this delivery boy
        if (order.assignedDeliveryBoy && order.assignedDeliveryBoy.toString() === deliveryBoyId.toString()) {
            return res.status(200).json(
                new ApiResponse(200, order, "Order already accepted by you")
            );
        }
        // Check if accepted by another delivery boy
        if (order.assignedDeliveryBoy && order.assignedDeliveryBoy.toString() !== deliveryBoyId.toString()) {
            return res.status(400).json(
                new ApiResponse(400, null, "This order has already been accepted by another delivery boy")
            );
        }
        return res.status(403).json(
            new ApiResponse(403, null, "This order is not assigned to you")
        );
    }

    // Check if order status is 2 (assigned)
    if (order.orderStatus !== 2) {
        return res.status(400).json(
            new ApiResponse(400, null, "Order cannot be accepted at this stage")
        );
    }

    // Verify delivery boy exists and is active
    const deliveryBoy = await DeliverBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
        return res.status(404).json(
            new ApiResponse(404, null, "Delivery boy not found")
        );
    }
    if (deliveryBoy.status !== 2) { // 2 = approved status
        return res.status(400).json(
            new ApiResponse(400, null, "Delivery boy is not active")
        );
    }

    // Atomic update: Remove this delivery boy from assignedDeliveryBoys and set assignedDeliveryBoy
    // Include condition to ensure assignedDeliveryBoy is null/undefined to prevent race conditions
    const updatedOrder = await Order.findOneAndUpdate(
        {
            _id: orderId,
            $or: [
                { assignedDeliveryBoy: null },
                { assignedDeliveryBoy: { $exists: false } }
            ],
            assignedDeliveryBoys: deliveryBoyId,
            orderStatus: 2
        },
        {
            $set: {
                assignedDeliveryBoy: deliveryBoyId,
            },
            $pull: {
                assignedDeliveryBoys: deliveryBoyId
            },
            $push: {
                orderTimeline: {
                    title: `Order accepted by delivery boy`,
                    dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
                    status: "ACCEPTED_BY_DELIVERY_BOY",
                }
            }
        },
        { new: true }
    ).populate({
        path: "hotelId",
        select: "hotelName address phoneNumber",
    }).populate({
        path: "userId",
        select: "name phoneNumber",
    });

    if (!updatedOrder) {
        return res.status(400).json(
            new ApiResponse(400, null, "Failed to accept order")
        );
    }

    const io = getIO();

    // Notify other delivery boys that order was accepted
    const otherDeliveryBoys = order.assignedDeliveryBoys.filter(
        id => id.toString() !== deliveryBoyId.toString()
    );

    otherDeliveryBoys.forEach((otherDeliveryBoyId) => {
        io.to(`deliveryBoy_${otherDeliveryBoyId}`).emit("orderAcceptedByOther", {
            type: "ORDER_ACCEPTED_BY_OTHER",
            orderId: order.orderId,
            message: `Order ${order.orderId} has been accepted by another delivery boy`,
            timestamp: new Date(),
        });
    });

    // Notify the accepting delivery boy
    io.to(`deliveryBoy_${deliveryBoyId}`).emit("orderAccepted", {
        type: "ORDER_ACCEPTED",
        orderId: order.orderId,
        order: updatedOrder,
        message: `Order ${order.orderId} accepted successfully`,
        timestamp: new Date(),
    });

    // Populate order for customer notification
    const populatedOrderForCustomer = await Order.findById(order._id)
        .populate({
            path: "hotelId",
            select: "hotelName address phoneNumber userId",
        })
        .populate({
            path: "userId",
            select: "name phoneNumber",
        })
        .populate({
            path: "address",
            select: "address location",
        })
        .populate({
            path: "products.dishId",
            select: "dishName userPrice partnerPrice",
        });

    // Emit orderStatusUpdate to customer
    io.to(`user_${order.userId}`).emit("orderStatusUpdate", {
        type: "ORDER_STATUS_UPDATE",
        orderId: order.orderId,
        order: populatedOrderForCustomer || updatedOrder,
        oldStatus: order.orderStatus,
        newStatus: order.orderStatus, // Status remains 2, but delivery boy is now assigned
        timestamp: new Date(),
    });

    // Emit orderAcceptedByDeliveryBoy to customer
    io.to(`user_${order.userId}`).emit("orderAcceptedByDeliveryBoy", {
        type: "ORDER_ACCEPTED_BY_DELIVERY_BOY",
        orderId: order.orderId,
        order: populatedOrderForCustomer || updatedOrder,
        deliveryBoyId: deliveryBoyId,
        timestamp: new Date(),
    });

    // Notify partner/hotel
    const hotel = await hotelModel.findById(order.hotelId);
    if (hotel && hotel.userId) {
        io.to(`partner_${hotel.userId}`).emit("orderAcceptedByDeliveryBoy", {
            type: "ORDER_ACCEPTED_BY_DELIVERY_BOY",
            orderId: order.orderId,
            order: updatedOrder,
            deliveryBoyId: deliveryBoyId,
            timestamp: new Date(),
        });
    }

    console.log(`✅ Order ${order.orderId} accepted by delivery boy ${deliveryBoyId}`);
    console.log(`📢 Notified ${otherDeliveryBoys.length} other delivery boys`);
    console.log(`👤 Notified customer: ${order.userId}`);

    return res.status(200).json(
        new ApiResponse(200, updatedOrder, "Order accepted successfully")
    );
});

exports.updateOrder = asyncHandler(async (req, res) => {
    const { orderId, status, deliveryBoyId, paymentMode, otp } = req.body;

    // Input validation
    if (!orderId) {
        return res.status(400).json(
            new ApiResponse(400, null, "Order ID is required")
        );
    }

    if (status === undefined || status === null) {
        return res.status(400).json(
            new ApiResponse(400, null, "Order status is required")
        );
    }

    if (!Types.ObjectId.isValid(orderId)) {
        return res.status(400).json(
            new ApiResponse(400, null, "Invalid order ID format")
        );
    }

    // Validate status enum
    const validStatuses = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    if (!validStatuses.includes(Number(status))) {
        return res.status(400).json(
            new ApiResponse(400, null, "Invalid order status")
        );
    }

    // Validate delivery boy ID if provided
    if (deliveryBoyId && !Types.ObjectId.isValid(deliveryBoyId)) {
        return res.status(400).json(
            new ApiResponse(400, null, "Invalid delivery boy ID format")
        );
    }

    // Find order first
    const savedOrder = await Order.findById(orderId);
    if (!savedOrder) {
        return res.status(404).json(
            new ApiResponse(404, null, "Order not found")
        );
    }

    // Validate delivery boy exists if assigning
    if (deliveryBoyId && status === 2) {
        const deliveryBoy = await DeliverBoy.findById(deliveryBoyId);
        if (!deliveryBoy) {
            return res.status(404).json(
                new ApiResponse(404, null, "Delivery boy not found")
            );
        }
        if (deliveryBoy.status !== 2) { // 2 = approved status
            return res.status(400).json(
                new ApiResponse(400, null, "Delivery boy is not active")
            );
        }
    }

    // Handle payment screenshot for UPI
    let url;
    if (paymentMode === "UPI") {
        if (!req.file) {
            throw new ApiError(400, "Payment photo is required for UPI payment");
        }
        const { filename } = req.file;
        url = `https://${req.hostname}/upload/${filename}`;
    }

    // Comprehensive status transition validation
    const oldStatus = savedOrder.orderStatus;
    const newStatus = Number(status);
    const statusNumber = Number(status); // Convert status to number for consistent comparison throughout function // Convert to number for consistent comparison
    
    // Define valid status transitions based on documented flow
    const validTransitions = {
        0: [1, 4, 5, 7], // Received can transition to: Being Prepared, Accepted, Cancelled by Hotel, Cancelled by Customer
        1: [2, 5], // Being Prepared can transition to: Delivery Assigned, Cancelled by Hotel
        2: [3, 6, 8], // Delivery Assigned can transition to: Delivered, Pickup Confirmed, Rejected by Delivery Boy
        3: [], // Delivered is final (cannot transition)
        4: [1, 2, 5], // Accepted can transition to: Being Prepared, Delivery Assigned, Cancelled by Hotel
        5: [], // Cancelled by Hotel is final (cannot transition)
        6: [3, 8], // Pickup Confirmed can transition to: Delivered, Rejected by Delivery Boy
        7: [], // Cancelled by Customer is final (cannot transition)
        8: [2], // Rejected by Delivery Boy can transition to: Delivery Assigned (re-assignment)
    };
    
    // Check if transition is valid
    if (oldStatus !== newStatus) {
        const allowedTransitions = validTransitions[oldStatus] || [];
        if (!allowedTransitions.includes(newStatus)) {
            return res.status(400).json(
                new ApiResponse(
                    400, 
                    null, 
                    `Invalid status transition: Cannot change order status from ${oldStatus} (${getStatusName(oldStatus)}) to ${newStatus} (${getStatusName(newStatus)}). Valid transitions from ${oldStatus} are: ${allowedTransitions.join(', ')}`
                )
            );
        }
    }
    
    // Helper function to get status name
    function getStatusName(statusCode) {
        const statusNames = {
            0: 'Received',
            1: 'Being Prepared',
            2: 'Delivery Assigned',
            3: 'Delivered',
            4: 'Accepted',
            5: 'Cancelled by Hotel',
            6: 'Pickup Confirmed',
            7: 'Cancelled by Customer',
            8: 'Rejected by Delivery Boy'
        };
        return statusNames[statusCode] || 'Unknown';
    }
    
    // Validate order status transitions for assignment
    const validStatusesForAssignment = [0, 1, 4]; // received, being prepared, accepted
    if (status === 2 && !validStatusesForAssignment.includes(savedOrder.orderStatus)) {
        return res.status(400).json(
            new ApiResponse(400, null, "Order cannot be assigned at this stage. Order must be in status 0 (Received), 1 (Being Prepared), or 4 (Accepted)")
        );
    }

    // Require OTP verification when delivery boy marks order as delivered
    if (Number(status) === 3 && deliveryBoyId) {
        const trimmedOtp = otp ? otp.toString().trim() : "";
        if (!trimmedOtp) {
            return res.status(400).json(
                new ApiResponse(400, null, "Delivery OTP is required to complete the order"),
            );
        }

        if (!savedOrder.otp) {
            return res.status(400).json(
                new ApiResponse(400, null, "Delivery OTP not available for this order"),
            );
        }

        if (savedOrder.otp !== trimmedOtp) {
            return res.status(400).json(
                new ApiResponse(400, null, "Invalid delivery OTP. Please try again."),
            );
        }
    }

    // Atomic update to prevent race conditions
    const updateCondition = {
        _id: orderId,
    };

    // For assignment (status 2), ensure order is not already assigned
    if (status === 2 && deliveryBoyId) {
        updateCondition.$or = [
            { assignedDeliveryBoy: null },
            { orderStatus: { $ne: 2 } }
        ];
    }

    const update = {
        $set: {
            orderStatus: status,
            ...(deliveryBoyId && { 
                assignedDeliveryBoy: deliveryBoyId,
                assignedDeliveryBoys: [deliveryBoyId] // Also add to array for consistency
            }),
            ...(paymentMode && { paymentMode: paymentMode }),
            ...(url && { upi_paymentScreenShot: url }),
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
        case 8:
            timelineEntry = {
                title: "Order rejected by delivery boy",
                dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
                status: "REJECTED_BY_DELIVERY_BOY",
            };
            break;
        default:
            break;
    }

    if (timelineEntry.title) {
        update.$push = { orderTimeline: timelineEntry };
    }

    // Atomic update with condition check
    const order = await Order.findOneAndUpdate(updateCondition, update, { new: true });

    if (!order) {
        return res.status(400).json(
            new ApiResponse(400, null, "Order already assigned or invalid status for this operation")
        );
    }

    const io = getIO();

    // Populate order for socket events
    const populatedOrderForSocket = await Order.findById(order._id)
        .populate({
            path: "hotelId",
            select: "hotelName address phoneNumber userId",
        })
        .populate({
            path: "userId",
            select: "name phoneNumber",
        })
        .populate({
            path: "address",
            select: "address location",
        })
        .populate({
            path: "products.dishId",
            select: "dishName userPrice partnerPrice",
        });

    // Emit generic orderStatusUpdate event for all status changes
    const statusUpdatePayload = {
        type: "ORDER_STATUS_UPDATE",
        orderId: order.orderId,
        order: populatedOrderForSocket || order,
        oldStatus: oldStatus,
        newStatus: status,
        timestamp: new Date(),
    };

    // Get hotel for partner notifications
    const hotel = await hotelModel.findById(order.hotelId);

    // Emit to customer
    io.to(`user_${order.userId}`).emit("orderStatusUpdate", statusUpdatePayload);

    // Emit to partner if hotel exists
    if (hotel && hotel.userId) {
        io.to(`partner_${hotel.userId}`).emit("orderStatusUpdate", statusUpdatePayload);
    }

    // Emit to admin dashboard
    io.to("admin_dashboard").emit("orderStatusUpdate", statusUpdatePayload);

    // Handle delivery boy assignment (status 2)
    // statusNumber already declared above
    console.log(`🔍 [updateOrder] Checking delivery boy assignment condition:`);
    console.log(`   deliveryBoyId: ${deliveryBoyId} (type: ${typeof deliveryBoyId})`);
    console.log(`   status: ${status} (type: ${typeof status})`);
    console.log(`   statusNumber: ${statusNumber} (converted)`);
    console.log(`   Condition check: deliveryBoyId && statusNumber === 2`);
    console.log(`   Result: ${deliveryBoyId && statusNumber === 2}`);
    
    if (deliveryBoyId && statusNumber === 2) {
        console.log(`✅ [updateOrder] Emitting orderAssigned event to delivery boy: ${deliveryBoyId}`);
        
        // Use already populated order
        const assignedHotel = populatedOrderForSocket?.hotelId || hotel || {};

        // Send Socket.IO notification to delivery boy with populated order
        const orderAssignedPayload = {
            type: "ORDER_ASSIGNED",
            orderId: order.orderId,
            order: populatedOrderForSocket || order,
            hotel: assignedHotel,
            timestamp: new Date(),
            message: `Order ${order.orderId} has been assigned to you`,
            priority: "high",
            totalAmount: order.priceDetails?.totalAmountToPay,
            itemCount: order.products?.length,
            paymentMode: order.paymentMode,
            hotelName: assignedHotel.hotelName || assignedHotel.name,
            hotelAddress: assignedHotel.address,
        };

        const roomName = `deliveryBoy_${deliveryBoyId}`;
        console.log(`   Room name: ${roomName}`);
        
        // Check if room exists
        const room = io.sockets.adapter.rooms.get(roomName);
        const roomSize = room ? room.size : 0;
        console.log(`   Room exists: ${room !== undefined}, Sockets in room: ${roomSize}`);
        
        io.to(roomName).emit("orderAssigned", orderAssignedPayload);
        
        console.log(`✅ Order assigned notification sent to delivery boy: ${deliveryBoyId}`);
        console.log(`📦 Order ID: ${order.orderId}`);
        console.log(`🏨 Hotel: ${assignedHotel.hotelName || assignedHotel.name || 'N/A'}`);
        console.log(`💰 Amount: ₹${order.priceDetails?.totalAmountToPay || 'N/A'}`);

        // Send push notifications
        sendNotification(deliveryBoyId, "Order assigned to you", order);
        sendNotification(
            order.userId,
            "Delivery boy assigned to your order",
            order,
        );

        // Emit to customer room
        io.to(`user_${order.userId}`).emit("orderAssigned", {
            ...orderAssignedPayload,
            type: "ORDER_ASSIGNED_TO_DELIVERY_BOY",
        });

        // Notify hotel/partner
        if (hotel && hotel.userId) {
            io.to(`partner_${hotel.userId}`).emit("orderAssignedToDeliveryBoy", {
                type: "ORDER_ASSIGNED_TO_DELIVERY_BOY",
                orderId: order.orderId,
                order: populatedOrderForSocket || order,
                deliveryBoyId: deliveryBoyId,
                timestamp: new Date(),
            });
        }
    }

    // Handle pickup confirmation (status 6)
    // Convert status to number for comparison (frontend may send as string)
    if (statusNumber === 6 && deliveryBoyId) {
        const pickupPayload = {
            type: "PICKUP_CONFIRMED",
            orderId: order.orderId,
            order: populatedOrderForSocket || order,
            timestamp: new Date(),
        };

        io.to(`deliveryBoy_${deliveryBoyId}`).emit("pickupConfirmed", pickupPayload);
        
        // Emit to customer
        io.to(`user_${order.userId}`).emit("pickupConfirmed", pickupPayload);

        if (hotel && hotel.userId) {
            sendNotification(hotel.userId, "Order pickup confirmed", order);
            io.to(`partner_${hotel.userId}`).emit("orderPickupConfirmed", {
                type: "ORDER_PICKUP_CONFIRMED",
                orderId: order.orderId,
                order: populatedOrderForSocket || order,
                timestamp: new Date(),
            });
        }
    }

    // Handle order delivery (status 3)
    // statusNumber already declared above
    if (statusNumber === 3 && deliveryBoyId) {
        // Verify order status is actually 3 (Delivered) before creating earning
        if (order.orderStatus !== 3) {
            console.warn(`⚠️ Order ${order.orderId} status is ${order.orderStatus}, not 3 (Delivered). Skipping earning creation.`);
        } else {
            // Create earning for driver when order is delivered
            try {
                console.log(`💰 Creating earning for driver ${deliveryBoyId} on order ${order.orderId}`);
                const result = await createEarningInternal(deliveryBoyId, order._id.toString());
                
                if (result.existing) {
                    console.log(`⚠️ Earning already exists for order ${order.orderId} and driver ${deliveryBoyId}`);
                } else {
                    console.log(`✅ Earning created successfully for driver ${deliveryBoyId} on order ${order.orderId}`);
                }
            } catch (error) {
                // Log error but don't fail the order update
                console.error(`❌ Error creating earning for driver ${deliveryBoyId} on order ${order.orderId}:`, error.message || error);
            }
        }

        // Fetch today's orders for the delivery boy
        const todayStart = moment().startOf("day").toDate();
        const todayEnd = moment().endOf("day").toDate();

        const deliveryBoyOrders = await Order.find({
            assignedDeliveryBoy: deliveryBoyId,
            orderStatus: 3, // Delivered status
            createdAt: { $gte: todayStart, $lte: todayEnd },
        });

        const deliveryCount = deliveryBoyOrders.length;

        const data = await Data.findOne(); // Fetching incentive data
        let incentive = 0;

        if (data) {
            if (deliveryCount >= 21) {
                incentive = data.deliveryBoyIncentiveFor21delivery || 200;
            } else if (deliveryCount >= 16) {
                incentive = data.deliveryBoyIncentiveFor16delivery || 100;
            }
        }

        if (incentive > 0) {
            await Order.updateMany(
                { assignedDeliveryBoy: deliveryBoyId, orderStatus: 3 },
                { $set: { deliveryBoyIncentive: incentive } },
            );
        }

        // Send Socket.IO notification
        const deliveredPayload = {
            type: "ORDER_DELIVERED",
            orderId: order.orderId,
            order: populatedOrderForSocket || order,
            incentive: incentive,
            deliveryCount: deliveryCount,
            timestamp: new Date(),
        };

        io.to(`deliveryBoy_${deliveryBoyId}`).emit("orderDelivered", deliveredPayload);
        
        // Emit to customer
        io.to(`user_${order.userId}`).emit("orderDelivered", deliveredPayload);

        // Send notifications
        if (hotel && hotel.userId) {
            sendNotification(hotel.userId, "Order delivered", order);
        }
        sendNotification(order.userId, "Order delivered", order);
        sendNotification(deliveryBoyId, "Order delivered successfully", order);
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


exports.getHotelOrdersByStatus = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const { hotelId } = req.params;

    let matchQuery = {
        hotelId: new Types.ObjectId(hotelId),
    };

    if (status) {
        matchQuery.orderStatus = Number(status);
    }

    const aggregationPipeline = [
        { $match: matchQuery },

        // Lookup all dishes that may appear in the products array
        {
            $lookup: {
                from: "hoteldishes",
                localField: "products.dishId",
                foreignField: "_id",
                as: "dishDetails"
            }
        },

        // Merge dishInfo into each product
        {
            $addFields: {
                products: {
                    $map: {
                        input: "$products",
                        as: "product",
                        in: {
                            $mergeObjects: [
                                "$$product",
                                {
                                    dishInfo: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$dishDetails",
                                                    as: "d",
                                                    cond: { $eq: ["$$d._id", "$$product.dishId"] }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        },

        // Optionally remove the temporary dishDetails array
        {
            $project: {
                dishDetails: 0
            }
        }
    ];

    const orders = await Order.aggregate(aggregationPipeline);
    const dataCount = await Order.countDocuments(matchQuery);

    if (!orders || orders.length === 0) {
        return res.status(200).json({
            message: "No orders found",
            content: [],
        });
    }

    return res.status(200).json({
        message: "Orders fetched successfully",
        content: orders,
        count: dataCount
    });
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
        deliveryBoyId,
        ps,
        ds,
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
    if (deliveryBoyId) {
        dbQuery = {
            assignedDeliveryBoy: new Types.ObjectId(deliveryBoyId),
        };
    }
    if (ps) {
        dbQuery.compensationPaidToHotelPartner = ps;
    }
    if (ds) {
        dbQuery.compensationPaidToDeliveryBoy = ds;
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
            {
                $lookup: {
                    as: "deliveryboyDetails",
                    from: "deliveryboys",
                    foreignField: "_id",
                    localField: "assignedDeliveryBoy",
                    pipeline: [
                        {
                            $project: {
                                firstName: 1,
                                lastName: 1,
                                phoneNumber: 1,
                                address: 1,
                            },
                        },
                    ],
                },
            },
        );
    }
    const dataCount = await Order.countDocuments(dbQuery);
    let orders = await Order.aggregate(orderAggregation);

    // Populate product dish details so frontend can access product information
    orders = await Order.populate(orders, {
        path: "products.dishId",
        select: "name image_url local_imagePath userPrice partnerPrice description categoryId",
        populate: {
            path: "categoryId",
            select: "name image_url",
        },
    });
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
    
    // Input validation
    if (!deliveryBoyId) {
        return res.status(400).json(
            new ApiResponse(400, null, "Delivery boy ID is required")
        );
    }

    if (!Types.ObjectId.isValid(deliveryBoyId)) {
        return res.status(400).json(
            new ApiResponse(400, null, "Invalid delivery boy ID format")
        );
    }

    // Verify delivery boy exists
    const deliveryBoy = await DeliverBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
        return res.status(404).json(
            new ApiResponse(404, null, "Delivery boy not found")
        );
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Status filter
    // Query parameter 'accepted' differentiates between:
    //   - accepted=false or undefined: Show orders in assignedDeliveryBoys (New Orders - not yet accepted)
    //   - accepted=true: Show orders where assignedDeliveryBoy equals this delivery boy (Accepted Orders)
    let dbQuery = {};
    
    const isAccepted = req.query.accepted === 'true';
    
    if (req.query.status !== undefined) {
        const status = parseInt(req.query.status);
        if (!isNaN(status) && [0, 1, 2, 3, 4, 5, 6, 7, 8].includes(status)) {
            dbQuery.orderStatus = status;
            
            // For status 2: Differentiate between new orders and accepted orders
            if (status === 2) {
                const deliveryBoyObjectId = new Types.ObjectId(deliveryBoyId);
                if (isAccepted) {
                    // Accepted Orders: Show only orders accepted by this delivery boy
                    dbQuery.assignedDeliveryBoy = deliveryBoyObjectId;
                } else {
                    // New Orders: Show only orders in assignedDeliveryBoys array (not yet accepted by ANYONE)
                    // Order must be in assignedDeliveryBoys array AND assignedDeliveryBoy must be null/undefined
                    // (meaning it hasn't been accepted by anyone yet)
                    dbQuery.$and = [
                        { assignedDeliveryBoys: deliveryBoyObjectId }, // Delivery boy is in the assigned array
                        {
                            $or: [
                                { assignedDeliveryBoy: null },
                                { assignedDeliveryBoy: { $exists: false } }
                            ]
                        }
                    ];
                }
            } else {
                // For other statuses: Only show orders assigned to this delivery boy
                dbQuery.assignedDeliveryBoy = new Types.ObjectId(deliveryBoyId);
            }
        }
    } else {
        // No status filter: Show all orders assigned to this delivery boy
        const deliveryBoyObjectId = new Types.ObjectId(deliveryBoyId);
        if (isAccepted) {
            dbQuery.assignedDeliveryBoy = deliveryBoyObjectId;
        } else {
            dbQuery.$or = [
                { assignedDeliveryBoy: deliveryBoyObjectId },
                { assignedDeliveryBoys: deliveryBoyObjectId }
            ];
        }
    }
    
    // Debug logging - show full query
    console.log(`🔍 Query for delivery boy ${deliveryBoyId}:`);
    console.log(`   Status: ${req.query.status || 'all'}`);
    console.log(`   Accepted: ${isAccepted} (from query: ${req.query.accepted})`);
    console.log(`   Delivery Boy ID (string): ${deliveryBoyId}`);
    console.log(`   Delivery Boy ID (ObjectId): ${new Types.ObjectId(deliveryBoyId)}`);
    console.log(`   Query structure:`, JSON.stringify(dbQuery, null, 2));
    
    // Test queries to verify data exists
    console.log(`🧪 Running test queries...`);
    
    // Test 1: Simple query - just check if any order has this delivery boy in array
    const testQuery1 = { 
        orderStatus: 2,
        assignedDeliveryBoys: new Types.ObjectId(deliveryBoyId)
    };
    const testOrder1 = await Order.findOne(testQuery1);
    console.log(`   Test 1 - Simple query (status=2, assignedDeliveryBoys=ID):`, testOrder1 ? {
        orderId: testOrder1.orderId,
        orderStatus: testOrder1.orderStatus,
        assignedDeliveryBoys: testOrder1.assignedDeliveryBoys?.map(id => id.toString()),
        assignedDeliveryBoy: testOrder1.assignedDeliveryBoy?.toString() || 'null'
    } : '❌ No order found');
    
    // Test 2: Check all orders with status 2
    const testQuery2 = { orderStatus: 2 };
    const allStatus2Orders = await Order.find(testQuery2).limit(5);
    console.log(`   Test 2 - All orders with status 2 (first 5):`, allStatus2Orders.map(o => ({
        orderId: o.orderId,
        assignedDeliveryBoys: o.assignedDeliveryBoys?.map(id => id.toString()) || [],
        assignedDeliveryBoy: o.assignedDeliveryBoy?.toString() || 'null'
    })));
    
    // Test 3: Check if delivery boy ID matches any in database
    const allOrdersWithDeliveryBoys = await Order.find({ 
        orderStatus: 2,
        assignedDeliveryBoys: { $exists: true, $ne: [] }
    }).limit(5);
    console.log(`   Test 3 - Orders with assignedDeliveryBoys array:`, allOrdersWithDeliveryBoys.map(o => ({
        orderId: o.orderId,
        assignedDeliveryBoys: o.assignedDeliveryBoys?.map(id => id.toString()) || [],
        assignedDeliveryBoy: o.assignedDeliveryBoy?.toString() || 'null',
        deliveryBoyIdInArray: o.assignedDeliveryBoys?.some(id => id.toString() === deliveryBoyId.toString())
    })));

    // Get total count for pagination
    const totalCount = await Order.countDocuments(dbQuery);
    const totalPages = Math.ceil(totalCount / limit);
    
    console.log(`📊 Query result: Found ${totalCount} orders for delivery boy ${deliveryBoyId}`);
    console.log(`   Status filter: ${req.query.status || 'all'}, accepted=${isAccepted}`);
    
    // If no results, try alternative queries to debug
    if (totalCount === 0 && req.query.status === '2' && !isAccepted) {
        console.log(`⚠️ No results found. Trying alternative queries...`);
        
        // Alternative 1: Just check array match
        const altQuery1 = {
            orderStatus: 2,
            assignedDeliveryBoys: new Types.ObjectId(deliveryBoyId)
        };
        const altCount1 = await Order.countDocuments(altQuery1);
        console.log(`   Alt Query 1 (direct array match): Found ${altCount1} orders`);
        
        // Alternative 2: Use $in
        const altQuery2 = {
            orderStatus: 2,
            assignedDeliveryBoys: { $in: [new Types.ObjectId(deliveryBoyId)] }
        };
        const altCount2 = await Order.countDocuments(altQuery2);
        console.log(`   Alt Query 2 (using $in): Found ${altCount2} orders`);
        
        // Alternative 3: Use $elemMatch
        const altQuery3 = {
            orderStatus: 2,
            assignedDeliveryBoys: { $elemMatch: { $eq: new Types.ObjectId(deliveryBoyId) } }
        };
        const altCount3 = await Order.countDocuments(altQuery3);
        console.log(`   Alt Query 3 (using $elemMatch): Found ${altCount3} orders`);
        
        // Show sample order if any alternative works
        if (altCount1 > 0 || altCount2 > 0 || altCount3 > 0) {
            const workingQuery = altCount1 > 0 ? altQuery1 : (altCount2 > 0 ? altQuery2 : altQuery3);
            const altOrder = await Order.findOne(workingQuery);
            console.log(`   ✅ Working query found order:`, {
                orderId: altOrder?.orderId,
                assignedDeliveryBoys: altOrder?.assignedDeliveryBoys?.map(id => id.toString()),
                assignedDeliveryBoy: altOrder?.assignedDeliveryBoy?.toString() || 'null',
                assignedDeliveryBoyType: altOrder?.assignedDeliveryBoy ? 'ObjectId' : 'null'
            });
        }
    }

    // Fetch orders with pagination
    const orders = await Order.find(dbQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
            path: "userId",
            select: "name profile_image phoneNumber",
        })
        .populate({
            path: "assignedDeliveryBoy",
            select: "firstName lastName phoneNumber",
        })
        .populate({
            path: "address",
            select: "type address location",
        })
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

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                orders: orders,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalCount: totalCount,
                    limit: limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                },
            },
            responseMessage.userMessage.ORDER_FETCHED_SUCCESSFULLY,
        ),
    );
});

exports.getOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await Order.findById(id)
        .populate({
            path: "userId",
            select: "name profile_image phoneNumber",
        })
        .populate({
            path: "assignedDeliveryBoy",
            select: "firstName lastName phoneNumber",
        })
        .populate({
            path: "address",
            select: "type address location",
        })
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
            path: "userId",
            select: "name profile_image phoneNumber",
        })
        .populate({
            path: "assignedDeliveryBoy",
            select: "firstName lastName phoneNumber",
        })
        .populate({
            path: "address",
            select: "type address location",
        })
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

exports.orderSettlement = asyncHandler(async (req, res) => {
    const {
        orderIds,
        compensationPaidToDeliveryBoy,
        compensationPaidToHotelPartner,
    } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res
            .status(400)
            .send(new ApiResponse(400, null, "Order IDs are required"));
    }

    await Order.updateMany(
        { _id: { $in: orderIds } },
        {
            $set: {
                compensationPaidToDeliveryBoy,
                compensationPaidToHotelPartner,
            },
        },
        { new: true }, // Optional: This is not required but included for clarity
    );

    // Fetch the updated orders
    const updatedOrders = await Order.find({ _id: { $in: orderIds } });

    res.status(200).send(
        new ApiResponse(200, updatedOrders, "Order settlement updated"),
    );
});

//bulk delete
exports.bulkDelete = asyncHandler(async (req, res) => {
    // Delete all orders
    const result = await Order.deleteMany({});

    // Return the number of deleted documents
    res.status(200).json(
        new ApiResponse(
            200,
            result.deletedCount,
            "All orders deleted successfully",
        ),
    );
});
