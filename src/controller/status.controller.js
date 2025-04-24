const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const User = require("../models/user.model");
const Admin = require("../models/admin.model");
const Partner = require("../models/partner.model");
const DeliveryBoy = require("../models/deliveryBoy.model");
const { getIO } = require("../utils/socket");

/**
 * Get online status of a specific user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getOnlineStatus = asyncHandler(async (req, res) => {
    const { userId, userType } = req.params;

    let userModel;
    switch (parseInt(userType)) {
        case 1: // Admin
            userModel = Admin;
            break;
        case 2: // User
            userModel = User;
            break;
        case 3: // Delivery Boy
            userModel = DeliveryBoy;
            break;
        case 4: // Partner
            userModel = Partner;
            break;
        default:
            throw new Error("Invalid user type");
    }

    const user = await userModel.findById(userId).select("isOnline name email phoneNumber");
    if (!user) {
        return res.status(404).json(
            new ApiResponse(404, null, "User not found")
        );
    }

    return res.status(200).json(
        new ApiResponse(200, { 
            isOnline: user.isOnline,
            userDetails: {
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber
            }
        }, "Status retrieved successfully")
    );
});

/**
 * Get list of online users by type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getOnlineUsers = asyncHandler(async (req, res) => {
    const { userType } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let userModel;
    switch (parseInt(userType)) {
        case 1: // Admin
            userModel = Admin;
            break;
        case 2: // User
            userModel = User;
            break;
        case 3: // Delivery Boy
            userModel = DeliveryBoy;
            break;
        case 4: // Partner
            userModel = Partner;
            break;
        default:
            throw new Error("Invalid user type");
    }

    const [users, total] = await Promise.all([
        userModel.find({ isOnline: true })
            .select("name email phoneNumber isOnline lastSeen")
            .skip(skip)
            .limit(limit)
            .sort({ lastSeen: -1 }),
        userModel.countDocuments({ isOnline: true })
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            users,
            total,
            page,
            pages: Math.ceil(total / limit)
        }, "Online users retrieved successfully")
    );
});

/**
 * Update user's online status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateOnlineStatus = asyncHandler(async (req, res) => {
    const { userId, userType, isOnline } = req.body;

    let userModel;
    switch (parseInt(userType)) {
        case 1: // Admin
            userModel = Admin;
            break;
        case 2: // User
            userModel = User;
            break;
        case 3: // Delivery Boy
            userModel = DeliveryBoy;
            break;
        case 4: // Partner
            userModel = Partner;
            break;
        default:
            throw new Error("Invalid user type");
    }

    const user = await userModel.findByIdAndUpdate(
        userId,
        { 
            $set: { 
                isOnline,
                lastSeen: new Date()
            } 
        },
        { new: true }
    ).select("name email phoneNumber isOnline lastSeen");

    if (!user) {
        return res.status(404).json(
            new ApiResponse(404, null, "User not found")
        );
    }

    // Broadcast status change to all connected clients
    const io = getIO();
    io.emit("userStatusChanged", {
        userId,
        userType,
        isOnline,
        lastSeen: user.lastSeen
    });

    return res.status(200).json(
        new ApiResponse(200, user, "Status updated successfully")
    );
});

/**
 * Get user's last seen timestamp
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getLastSeen = asyncHandler(async (req, res) => {
    const { userId, userType } = req.params;

    let userModel;
    switch (parseInt(userType)) {
        case 1: // Admin
            userModel = Admin;
            break;
        case 2: // User
            userModel = User;
            break;
        case 3: // Delivery Boy
            userModel = DeliveryBoy;
            break;
        case 4: // Partner
            userModel = Partner;
            break;
        default:
            throw new Error("Invalid user type");
    }

    const user = await userModel.findById(userId).select("lastSeen name");
    if (!user) {
        return res.status(404).json(
            new ApiResponse(404, null, "User not found")
        );
    }

    return res.status(200).json(
        new ApiResponse(200, {
            lastSeen: user.lastSeen,
            name: user.name
        }, "Last seen retrieved successfully")
    );
}); 