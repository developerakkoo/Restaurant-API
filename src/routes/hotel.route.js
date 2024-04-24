const router = require("express").Router();
const HotelStarController = require("../controller/hotel.controller");

router.post("/add-star", HotelStarController.addStartToHotel);

router.get("/get-star/:starId", HotelStarController.getStartById);

router.get("/get/all-star/hotelId/:hotelId", HotelStarController.getAllStartsByHotelId);

router.delete(
    "/delete-star/userId",
    HotelStarController.deleteStartFromHotelByUserId,
);

router.delete("/delete-star/id/:starId", HotelStarController.deleteStartFromHotelById);

/* Hotel Dish */

router.post("/dish/add-star", HotelStarController.addStartToDish);

router.get("/dish/get-star/:starId", HotelStarController.getStartById);

router.get("/dish/get/all-star/:dishId", HotelStarController.getAllStartsByHotelId);

router.delete(
    "/dish/delete-star/userId",
    HotelStarController.deleteStartFromHotelByUserId,
);

router.delete("/delete-star/id/:starId", HotelStarController.deleteStartFromHotelById);

module.exports = { hotelStarRoutes: router };
