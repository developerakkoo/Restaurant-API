const router = require("express").Router();
const userDataValidator = require("../validators/user.validator");
const userController = require("../controller/user.controller");
const {
    getAllCategory,
    getAllVideos,
    getVideoById,
    checkPinCodeIdDeliverable
} = require("../controller/admin.controller");
const authController = require("../controller/auth.controller");
const {
    getPromoCode,
    getAllPromoCodes,
} = require("../controller/promoCode.controller");

router.post("/logout/:userId/:userType", authController.logoutUser);

router.get("/get/user/:userId", userController.getUserById);

router.get("/get/profile-stats/:id", userController.getUserProfileStats);

router.get('/coordinates/:userId/:hotelId',userController.getCoordinatesForCalculations);
router.put("/update/:userId", userController.updateUserProfile);

router.post("/add-address", userController.addAddresses);

router.get("/get/all-address/:userId", userController.getAllAddressesByUserId);

router.get("/get/addressById/:addressId", userController.getAddressesById);

router.put("/select-address", userController.selectAddresses);

router.put("/update-address", userController.updateAddress);

router.delete("/delete-address/:addressId/:userId", userController.deleteAddress);

/* Promo code routes*/
router.get("/promoCode/get/:promoCodeId", getPromoCode);

router.get("/promoCode/get-all", getAllPromoCodes);

/* track user */

router.post("/track/add", userController.addUserTrackRecord);

/* Category route*/

router.get("/category/get-all", getAllCategory);

/* Recommendation */

router.get("/get/recommended/dishes/:userId", userController.getRecommendation);

/* Hotel And  Category Search*/

router.get("/search", userController.hotelAndCategorySearch);

/* video routes */

router.get("/video/all", getAllVideos);

router.get("/video/get/:videoId", getVideoById);

router.post("/check/status", userController.checkUserStatus);



router.get(
    "/check/delivery-available/:pinCode",
    checkPinCodeIdDeliverable,
);




module.exports = { userRoutes: router };
