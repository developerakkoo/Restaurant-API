const router = require("express").Router();
const orderController = require("../controller/order.controller");
const { applyPromoCode } = require("../controller/promoCode.controller");

router.post("/initiate/payment", orderController.initiatePayment);

router.post("/place-order", orderController.placeOrder);

router.get("/get/order-by-id/:id", orderController.getOrderById);

router.get("/get-order/:orderId", orderController.getOrderByOrderId);

router.get(
    "/get/all-order/deliveryBoyId/:deliveryBoyId",
    orderController.getAllOrdersByDeliveryBoyId,
);

router.get("/get/all-order/userId/:userId", orderController.getOrdersByUserId);

router.post("/apply/promoCode", applyPromoCode);

module.exports = { orderRoutes: router };