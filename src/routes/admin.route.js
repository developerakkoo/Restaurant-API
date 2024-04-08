const router = require("express").Router();
const adminController = require("../controller/admin.controller");
const deliveryBoyController = require("../controller/deliveryBoy.controller");
const PartnerController = require("../controller/partner.controller");
const authController = require("../controller/auth.controller");
const validateData = require("../validators/admin.validator");
const { dataValidationResult } = require("../validators/validationResult");
const { upload } = require("../middleware/fileHandler.middleware");

router.post("/logout", authController.logoutUser);

router.get("/get/all-users", adminController.getAllUsers);

/*Partner */

router.get("/get/all-partners", adminController.getAllPartner);

/* Hotel */

router.post("/hotel/register", PartnerController.addHotel);

router.get("/get/all-hotels", adminController.getAllHotel);

router.post(
    "/hotel/upload/image",
    upload.single("document"),
    PartnerController.uploadHotelImage,
);

router.delete("/hotel/delete", PartnerController.deleteHotel);

router.put("/hotel/update", PartnerController.updateHotel);

/* Delivery boy */

router.get("/get/all-deliveryBoy", adminController.getAllDeliveryBoy);

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
