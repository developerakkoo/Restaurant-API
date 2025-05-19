const router = require("express").Router();
const deliveryBoyController = require("../controller/deliveryBoy.controller");
const { updateOrder } = require("../controller/order.controller");
const authController = require("../controller/auth.controller");

router.post("/logout", authController.logoutUser);

router.delete("/delete/document", deliveryBoyController.deletedDocument);

router.get("/profile", deliveryBoyController.getMyProfile);

router.get(
    "/get-all/documents-deliveryBoyId",
    deliveryBoyController.getAllDocumentsByUserId,
);

router.get("/get/document-by-id", deliveryBoyController.getDocumentById);

router.put("/accept/order-pickup-request", updateOrder);

router.put("/update-delivered-orders/:orderId/:userid", deliveryBoyController.updateDeliveredOrders);
router.put("/update", deliveryBoyController.updateDeliveryBoy);

/* Leave Request */
router.post("/ask-for-leave", deliveryBoyController.askForLeave);

router.get("/get/leave-requests", deliveryBoyController.getAllLeaveRequests);

/* Earnings */

router.get("/earnings/:deliveryBoyId", deliveryBoyController.getEarnings);

module.exports = { deliverBoyRoutes: router };
