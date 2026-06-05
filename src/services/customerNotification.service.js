const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const { getIO } = require("../utils/socket");
const { sendFirebaseNotification } = require("../utils/firebaseNotifier.utils");
const {
    getOrderNotificationMessage,
} = require("../constants/orderNotification.constants");

function normalizeContent(content) {
    if (typeof content === "string") {
        return content;
    }

    if (content == null) {
        return "";
    }

    try {
        return JSON.stringify(content);
    } catch {
        return String(content);
    }
}

/**
 * Unified customer notification: persist, socket emit, and FCM push.
 */
exports.notifyCustomer = async (
    userId,
    {
        title,
        body,
        type = "ADMIN_BROADCAST",
        orderId = "",
        orderStatus = "",
        mongoOrderId = "",
    },
) => {
    if (!userId) {
        return { persisted: false, fcm: null };
    }

    const notification = await Notification.create({
        userId,
        title,
        content: normalizeContent(body),
    });

    getIO().to(`user_${userId}`).emit("notification", notification);

    const user = await User.findById(userId).select("firebaseToken").lean();
    let fcm = { successCount: 0, failureCount: 0, invalidTokens: [] };

    if (user?.firebaseToken) {
        fcm = await sendFirebaseNotification(
            [user.firebaseToken],
            title,
            body,
            {
                type,
                orderId: String(orderId),
                orderStatus: String(orderStatus),
                mongoOrderId: String(mongoOrderId),
            },
        );
    }

    return { persisted: true, fcm, hasToken: Boolean(user?.firebaseToken) };
};

exports.notifyCustomerOrderStatus = async (userId, order, status, extra = {}) => {
    const { title, body } = getOrderNotificationMessage(status, order, extra);

    return exports.notifyCustomer(userId, {
        title,
        body,
        type: "ORDER_STATUS",
        orderId: order.orderId,
        orderStatus: status,
        mongoOrderId: order._id?.toString() || "",
    });
};

/**
 * Fire-and-forget wrapper for order handlers.
 */
exports.notifyCustomerOrderStatusAsync = (userId, order, status, extra = {}) => {
    exports.notifyCustomerOrderStatus(userId, order, status, extra).catch(
        (error) => {
            console.error(
                `notifyCustomerOrderStatus failed for order ${order?.orderId}:`,
                error.message,
            );
        },
    );
};

exports.notifyCustomerAsync = (userId, payload) => {
    exports.notifyCustomer(userId, payload).catch((error) => {
        console.error(`notifyCustomer failed for user ${userId}:`, error.message);
    });
};
