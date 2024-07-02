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

/* Leave Request */
router.post("/ask-for-leave", deliveryBoyController.askForLeave);

router.get("/get/leave-requests", deliveryBoyController.getAllLeaveRequests);

module.exports = { deliverBoyRoutes: router };
