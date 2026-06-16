const REFUND_STATUS = {
    NOT_APPLICABLE: "NOT_APPLICABLE",
    PENDING: "PENDING",
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
};

const PAID_ONLINE_MODES = ["RAZORPAY", "UPI"];

const CANCEL_WINDOW_SECONDS = 60;

const DEFAULT_REFUND_PENDING_MESSAGE =
    "Refund request received. Our team will process it shortly.";

const CANCELLED_BY = {
    CUSTOMER: "customer",
    HOTEL: "hotel",
    ADMIN: "admin",
};

function isPaidOnlineMode(paymentMode) {
    return PAID_ONLINE_MODES.includes(String(paymentMode || "").toUpperCase());
}

function getCancelWindowExpiresAt(order) {
    if (order?.cancelWindowExpiresAt) {
        return new Date(order.cancelWindowExpiresAt);
    }

    if (order?.createdAt) {
        return new Date(
            new Date(order.createdAt).getTime() + CANCEL_WINDOW_SECONDS * 1000,
        );
    }

    return null;
}

function getCancelSecondsRemaining(order) {
    const expiresAt = getCancelWindowExpiresAt(order);
    if (!expiresAt) {
        return 0;
    }

    return Math.max(
        0,
        Math.ceil((expiresAt.getTime() - Date.now()) / 1000),
    );
}

function canCustomerCancelOrder(order) {
    if (!order) {
        return false;
    }

    if (order.orderStatus !== 0) {
        return false;
    }

    return getCancelSecondsRemaining(order) > 0;
}

module.exports = {
    REFUND_STATUS,
    PAID_ONLINE_MODES,
    CANCEL_WINDOW_SECONDS,
    DEFAULT_REFUND_PENDING_MESSAGE,
    CANCELLED_BY,
    isPaidOnlineMode,
    getCancelWindowExpiresAt,
    getCancelSecondsRemaining,
    canCustomerCancelOrder,
};
