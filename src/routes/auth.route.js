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
const passport = require("passport");
const { ApiResponse } = require("../utils/ApiResponseHandler");

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
    // [userDataValidator.validateUserRegister, dataValidationResult],
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
    // [userDataValidator.validateUserRegister, dataValidationResult],
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

/* Forgot password*/
router.get("/user-forgot-password", (req, res, next) => {
    res.render("forgot-password");
});

router.post("/user-forgot-password", authController.forgotPassword);

router.get("/rest-password/:id/:token", authController.getResetPassword);

router.post("/rest-password/:id/:token", authController.ResetPassword);

/** Common Routes  */

router.get("/get-current-user", authController.getCurrentUserStatus);

router.post("/get-access-token", authController.reGenerateAccessToken);

/***** OTP Routes *****/

router.post("/send-otp", authController.sendOtp);

router.post("/verify-otp", authController.verifyOtp);

/******************************************************************************* Google Auth *********************************************************************************************/

router.route("/google").get(
    passport.authenticate("google", {
        scope: ["profile", "email"],
    }),
    (req, res) => {
        res.send("redirecting to google...");
    },
);

router
    .route("/google/callback")
    .get(passport.authenticate("google"), authController.handleSocialAuth);

/******************************************************************************* Facebook Auth *********************************************************************************************/

router
    .route("/facebook")
    .get(
        passport.authenticate("facebook", { scope: ["email"] }),
        (req, res) => {
            res.send("redirecting to google...");
        },
    );

router
    .route("/facebook/callback")
    .get(passport.authenticate("facebook"), authController.handleSocialAuth);

router.get("/sso/success", async (req, res) => {
    res.status(200).json(new ApiResponse(200, req.query, "Login success"));
});

module.exports = { authRoutes: router };
