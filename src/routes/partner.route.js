const router = require("express").Router();
const partnerController = require("../controller/partner.controller");
const HotelController = require("../controller/hotel.controller");
const authController = require("../controller/auth.controller");
const { upload } = require("../middleware/fileHandler.middleware");
const { getAllOrders } = require("../controller/order.controller");

router.post("/logout", authController.logoutUser);

/* Hotel Routes*/

router.post("/hotel/register", partnerController.addHotel);

router.post(
    "/hotel/upload/image",
    upload.single("document"),
    partnerController.uploadHotelImage,
);

router.put("/hotel/update", partnerController.updateHotel);

router.get("/get/hotels/:partnerId", partnerController.getHotelsByIdPartnerId);

router.delete("/hotel/delete", partnerController.deleteHotel);

router.get("/get/dashboard/:partnerId", partnerController.getPartnerDashboard);

router.get("/get/earnings/:partnerId", partnerController.getEarnings);

router.get("/get/orders", getAllOrders);

router.get("/get/byId/:partnerId", partnerController.getPartnerById);

/*Hotel Dish Route*/

router.post("/hotel/add-dish", HotelController.addDish);

router.post(
    "/hotel/dish/upload-image",
    upload.single("document"),
    HotelController.uploadDishImage,
);

router.get("/get-dish/:dishId", HotelController.getDishById);

router.put("/hotel/dish/update", HotelController.updateDish);

router.put(
    "/category/:categoryId/toggleStoke/:hotelId",
    partnerController.toggleCategoryOutOfStock,
);

router.put("/update/:partnerId", partnerController.updatePartner);

router.delete("/hotel/dish/delete", HotelController.deleteDish);
router.delete("/remove/delete/:hotelId/:partnerId", partnerController.deletePartnerAndHotel);

module.exports = { partnerRoutes: router };
