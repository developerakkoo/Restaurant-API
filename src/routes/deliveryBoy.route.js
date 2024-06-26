const router = require("express").Router();
const deliveryBoyController = require("../controller/deliveryBoy.controller");
const { updateOrder } = require("../controller/order.controller");
const authController = require("../controller/auth.controller");

router.post("/logout", authController.logoutUser);

router.delete("/delete/document", deliveryBoyController.deletedDocument);

router.get(
    "/get-all/documents-deliveryBoyId",
    deliveryBoyController.getAllDocumentsByUserId,
);

router.get("/get/document-by-id", deliveryBoyController.getDocumentById);

router.put("/accept/order-pickup-request", updateOrder);

module.exports = { deliverBoyRoutes: router };
