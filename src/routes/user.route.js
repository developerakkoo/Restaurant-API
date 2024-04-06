const router = require("express").Router();
const userDataValidator = require("../validators/user.validator");
const userController = require("../controller/user.controller");
const authController = require("../controller/auth.controller");

router.post("/logout", authController.logoutUser);

router.get("/get/user/:userId", userController.getUserById);

router.post("/add-address", userController.addAddresses);

router.get("/get/all-address/:userId", userController.getAllAddressesByUserId);

router.get("/get/addressById/:addressId", userController.getAddressesById);

router.put("/select-address", userController.selectAddresses);

router.put("/update-address", userController.updateAddress);

router.delete("/delete-address/:addressId", userController.deleteAddress);

module.exports = { userRoutes: router };
