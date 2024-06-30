const router = require("express").Router();
const partnerController = require("../controller/partner.controller");
const HotelController = require('../controller/hotel.controller')
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

/*Hotel Dish Route*/

router.post("/hotel/add-dish", HotelController.addDish);

router.post(
    "/hotel/dish/upload-image",
    upload.single("document"),
    HotelController.uploadDishImage,
);

router.get("/get-dish/:dishId", HotelController.getDishById);

router.put(
    "/hotel/dish/update",
    HotelController.updateDish,
);

router.delete(
    "/hotel/dish/delete",
    HotelController.deleteDish,
);


module.exports = { partnerRoutes: router };
