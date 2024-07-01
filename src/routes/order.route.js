const router = require("express").Router();
const orderController = require("../controller/order.controller");
const { applyPromoCode } = require("../controller/promoCode.controller");

router.post("/initiate/payment", orderController.initiatePayment);

router.post("/calculate/amount-to-pay", orderController.CalculateAmountToPay);

router.post("/place-order", orderController.placeOrder);

router.put("/accept-reject", orderController.acceptOrder);

router.get("/get/order-by-id/:id", orderController.getOrderById);

router.get("/get-order/:orderId", orderController.getOrderByOrderId);

router.put("/update/order-status",orderController.updateOrder)

router.get(
    "/get/all-order/deliveryBoyId/:deliveryBoyId",
    orderController.getAllOrdersByDeliveryBoyId,
);

router.get("/get/all-order/userId/:userId", orderController.getOrdersByUserId);

router.post("/apply/promoCode", applyPromoCode);

module.exports = { orderRoutes: router };
