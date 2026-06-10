const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const User = require("../models/user.model");
const Admin = require("../models/admin.model");
const Partner = require("../models/partner.model");
const DeliveryBoy = require("../models/deliveryBoy.model");
const { getIO } = require("../utils/socket");
const { emitDriverStatusChange } = require("../utils/driverStatus.util");

/**
 * Get online status of a specific user
 */
exports.getOnlineStatus = asyncHandler(async (req, res) => {
    const { userId, userType } = req.params;

    let userModel;
    switch (parseInt(userType)) {
        case 1:
            userModel = Admin;
            break;
        case 2:
            userModel = User;
            break;
        case 3:
            userModel = DeliveryBoy;
            break;
        case 4:
            userModel = Partner;
            break;
        default:
            throw new Error("Invalid user type");
    }

    const user = await userModel.findById(userId).select("isOnline name email phoneNumber lastSeen firstName lastName");
    if (!user) {
        return res.status(404).json(
            new ApiResponse(404, null, "User not found")
        );
    }

    return res.status(200).json(
        new ApiResponse(200, {
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
            userDetails: {
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                firstName: user.firstName,
                lastName: user.lastName,
            }
        }, "Status retrieved successfully")
    );
});

/**
 * Get list of online users by type
 */
exports.getOnlineUsers = asyncHandler(async (req, res) => {
    const { userType } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let userModel;
    switch (parseInt(userType)) {
        case 1:
            userModel = Admin;
            break;
        case 2:
            userModel = User;
            break;
        case 3:
            userModel = DeliveryBoy;
            break;
        case 4:
            userModel = Partner;
            break;
        default:
            throw new Error("Invalid user type");
    }

    const [users, total] = await Promise.all([
        userModel.find({ isOnline: true })
            .select("name email phoneNumber isOnline lastSeen firstName lastName")
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
 */
exports.updateOnlineStatus = asyncHandler(async (req, res) => {
    const { userId, userType, isOnline } = req.body;

    if (!userId || userType === undefined || isOnline === undefined) {
        return res.status(400).json(
            new ApiResponse(400, null, "userId, userType, and isOnline are required")
        );
    }

    let userModel;
    switch (parseInt(userType)) {
        case 1:
            userModel = Admin;
            break;
        case 2:
            userModel = User;
            break;
        case 3:
            userModel = DeliveryBoy;
            break;
        case 4:
            userModel = Partner;
            break;
        default:
            return res.status(400).json(
                new ApiResponse(400, null, "Invalid user type")
            );
    }

    if (parseInt(userType) === 3 && isOnline === true) {
        const existingDriver = await DeliveryBoy.findById(userId).select(
            "status verificationStatus",
        );
        if (!existingDriver) {
            return res.status(404).json(
                new ApiResponse(404, null, "Delivery boy not found")
            );
        }
        if (
            existingDriver.status !== 2 ||
            existingDriver.verificationStatus !== "verified"
        ) {
            return res.status(403).json(
                new ApiResponse(403, null, "Only approved delivery boys can go online")
            );
        }
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
    ).select("name email phoneNumber isOnline lastSeen firstName lastName");

    if (!user) {
        return res.status(404).json(
            new ApiResponse(404, null, "User not found")
        );
    }

    const io = getIO();
    if (parseInt(userType) === 3) {
        emitDriverStatusChange(io, user, isOnline);
    } else {
        io.emit("userStatusChanged", {
            userId,
            userType: parseInt(userType),
            isOnline,
            lastSeen: user.lastSeen,
        });
        io.to("admin_dashboard").emit("userStatusChanged", {
            userId,
            userType: parseInt(userType),
            isOnline,
            lastSeen: user.lastSeen,
        });
    }

    return res.status(200).json(
        new ApiResponse(200, user, "Status updated successfully")
    );
});

/**
 * Get user's last seen timestamp
 */
exports.getLastSeen = asyncHandler(async (req, res) => {
    const { userId, userType } = req.params;

    let userModel;
    switch (parseInt(userType)) {
        case 1:
            userModel = Admin;
            break;
        case 2:
            userModel = User;
            break;
        case 3:
            userModel = DeliveryBoy;
            break;
        case 4:
            userModel = Partner;
            break;
        default:
            throw new Error("Invalid user type");
    }

    const user = await userModel.findById(userId).select("lastSeen name firstName lastName");
    if (!user) {
        return res.status(404).json(
            new ApiResponse(404, null, "User not found")
        );
    }

    return res.status(200).json(
        new ApiResponse(200, {
            lastSeen: user.lastSeen,
            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        }, "Last seen retrieved successfully")
    );
});
