const ORDER_STATUS_NOTIFICATIONS = {
    0: {
        title: "Order placed",
        body: (order) => `Your order #${order.orderId} has been placed.`,
    },
    1: {
        title: "Being prepared",
        body: (order) => `Your order #${order.orderId} is being prepared.`,
    },
    2: {
        title: "Delivery assigned",
        body: (order) =>
            `A delivery partner is assigned to order #${order.orderId}.`,
    },
    3: {
        title: "Delivered",
        body: (order) => `Order #${order.orderId} delivered. Enjoy your meal!`,
    },
    4: {
        title: "Order accepted",
        body: (order, extra = {}) => {
            const hotelName =
                extra.hotelName ||
                order.hotelId?.hotelName ||
                order.hotelId?.name ||
                "The restaurant";
            return `${hotelName} accepted your order #${order.orderId}.`;
        },
    },
    5: {
        title: "Order cancelled",
        body: (order) =>
            `Order #${order.orderId} was cancelled by the restaurant.`,
    },
    6: {
        title: "On the way",
        body: (order) =>
            `Your order #${order.orderId} has been picked up and is on the way.`,
    },
    7: {
        title: "Order cancelled",
        body: (order) => `You cancelled order #${order.orderId}.`,
    },
    8: {
        title: "Delivery update",
        body: (order) =>
            `We're finding a new delivery partner for order #${order.orderId}.`,
    },
};

exports.getOrderNotificationMessage = (status, order, extra = {}) => {
    const template = ORDER_STATUS_NOTIFICATIONS[Number(status)];

    if (!template) {
        return {
            title: "Order update",
            body: `Your order #${order.orderId} has been updated.`,
        };
    }

    return {
        title: template.title,
        body: template.body(order, extra),
    };
};
