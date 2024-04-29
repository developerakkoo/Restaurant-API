const router = require("express").Router();
const partnerController = require("../controller/partner.controller");
const authController = require("../controller/auth.controller");
const { upload } = require("../middleware/fileHandler.middleware");


router.post("/logout", authController.logoutUser);

router.post("/hotel/register", partnerController.addHotel);

router.post(
    "/hotel/upload/image",
    upload.single("document"),
    partnerController.uploadHotelImage,
);

router.put("/hotel/update", partnerController.updateHotel);

router.delete("/hotel/delete", partnerController.deleteHotel);

module.exports = { partnerRoutes: router };
