const router = require("express").Router();
const userDataValidator = require("../validators/user.validator");
const userController = require("../controller/user.controller");
const { getAllCategory } = require("../controller/admin.controller");
const authController = require("../controller/auth.controller");
const {
    getPromoCode,
    getAllPromoCodes,
} = require("../controller/promoCode.controller");

router.post("/logout", authController.logoutUser);

router.get("/get/user/:userId", userController.getUserById);

router.put("/update/:userId", userController.updateUserProfile);

router.post("/add-address", userController.addAddresses);

router.get("/get/all-address/:userId", userController.getAllAddressesByUserId);

router.get("/get/addressById/:addressId", userController.getAddressesById);

router.put("/select-address", userController.selectAddresses);

router.put("/update-address", userController.updateAddress);

router.delete("/delete-address/:addressId", userController.deleteAddress);

/* Promo code routes*/
router.get("/promoCode/get/:promoCodeId", getPromoCode);

router.get("/promoCode/get-all", getAllPromoCodes);

/* track user */

router.post("/track/add", userController.addUserTrackRecord);

/* Category route*/

router.get("/category/get-all", getAllCategory);

/* Recommendation */

router.get("/get/recommended/dishes/:userId", userController.getRecommendation);

module.exports = { userRoutes: router };
