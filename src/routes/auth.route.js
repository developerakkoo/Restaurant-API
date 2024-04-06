const router = require("express").Router();
const adminController = require("../controller/admin.controller");
const adminDataValidator = require("../validators/admin.validator");
const deliveryBoyController = require("../controller/deliveryBoy.controller");
const partnerController = require("../controller/partner.controller");
const userDataValidator = require("../validators/user.validator");
const userController = require("../controller/user.controller");
const authController = require("../controller/auth.controller");
const { upload } = require("../middleware/fileHandler.middleware");
const { dataValidationResult } = require("../validators/validationResult");

/** Admin Auth Routes */
router.post(
    "/admin/register",
    [adminDataValidator.validateAdminRegister, dataValidationResult],
    adminController.registerAdmin,
);

router.post(
    "/admin/login",
    [adminDataValidator.validateAdminLogin, dataValidationResult],
    adminController.loginAdmin,
);

/** User Auth Routes */
router.post(
    "/user/register",
    [userDataValidator.validateUserRegister, dataValidationResult],
    userController.registerUser,
);

router.post("/user/login", userController.loginUser);

router.post(
    "/user/upload/image",
    upload.single("document"),
    userController.uploadProfileImage,
);

router.delete("/user/delete/image", userController.deletedImage);

/** Delivery Boy Auth Routes */
router.post(
    "/delivery-boy/register",
    [userDataValidator.validateUserRegister, dataValidationResult],
    deliveryBoyController.registerDeliveryBoy,
);

router.post("/delivery-boy/login", deliveryBoyController.loginDeliveryBoy);

router.post(
    "/delivery-boy/upload/document",
    upload.single("document"),
    deliveryBoyController.uploadDocument,
);

router.post(
    "/delivery-boy/upload/image",
    upload.single("document"),
    deliveryBoyController.uploadProfileImage,
);

router.delete("/delivery-boy/delete/image", deliveryBoyController.deletedImage);

/* Partner Auth Routes */

router.post("/partner/register", partnerController.registerPartner);

router.post("/partner/login", partnerController.loginPartner);


/** Common Routes  */

router.post("/get-access-token", authController.reGenerateAccessToken);

module.exports = { authRoutes: router };
