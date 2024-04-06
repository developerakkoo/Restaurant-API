const router = require("express").Router();
const adminController = require("../controller/admin.controller");
const deliveryBoyController = require("../controller/deliveryBoy.controller");
const authController = require("../controller/auth.controller");
const validateData = require("../validators/admin.validator");
const { dataValidationResult } = require("../validators/validationResult");

router.post("/logout", authController.logoutUser);

router.get("/get/all-users", adminController.getAllUsers);

router.get("/get/all-deliveryBoy", adminController.getAllDeliveryBoy);

router.get("/get/all-partners", adminController.getAllPartner);

router.delete("/delete/delivery-boy/document", adminController.deletedDocument);

router.get(
    "/get-all/delivery-boy/documents",
    deliveryBoyController.getAllDocuments,
);

router.get(
    "/get-all/delivery-boy/documents-deliveryBoyId",
    deliveryBoyController.getAllDocumentsByUserId,
);

router.get(
    "/get/delivery-boy/document-by-id",
    deliveryBoyController.getDocumentById,
);

router.put("/update/user/status", adminController.updateUserStatus);

router.put("/update/partner/status", adminController.updatePartnerStatus);

router.put(
    "/update/delivery-boy/status",
    adminController.updateDeliveryBoyStatus,
);

router.put(
    "/update/delivery-boy/document/status",
    adminController.updateDeliveryBoyDocumentStatus,
);

module.exports = { adminRoutes: router };
