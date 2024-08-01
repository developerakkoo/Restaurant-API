const router = require("express").Router();
const HotelStarController = require("../controller/hotel.controller");
const { getAllHotel } = require("../controller/admin.controller");
const { upload } = require("../middleware/fileHandler.middleware");

router.get("/get/byId/:hotelId", HotelStarController.getHotelById);

router.post("/add-star", HotelStarController.addStartToHotel);

router.get("/get-star/:starId", HotelStarController.getStartById);

router.get(
    "/get/all-star/hotelId/:hotelId",
    HotelStarController.getAllStartsByHotelId,
);

router.get("/get-top", HotelStarController.getTopHotels);

router.get("/get-by/:categoryId/category", getAllHotel);

router.delete(
    "/delete-star/userId",
    HotelStarController.deleteStartFromHotelByUserId,
);

router.delete(
    "/delete-star/id/:starId",
    HotelStarController.deleteStartFromHotelById,
);

/* Hotel Dish */

router.post("/dish/bulk/add", HotelStarController.bulkDishCreate);

router.post(
    "/dish/add-star",
    upload.array("image", 5),
    HotelStarController.addStartToDish,
);

router.get("/dish/get/:hotelId", HotelStarController.getDishByHotelId);

router.get("/dish/get-star/:starId", HotelStarController.getDishStartById);

router.get(
    "/dish/get/all-star/:dishId",
    HotelStarController.getAllStartsByDishId,
);

router.delete(
    "/dish/delete-star/userId",
    HotelStarController.deleteStartFromDishByUserId,
);

router.delete(
    "/dish/delete-star/id/:starId",
    HotelStarController.deleteStartFromDishById,
);

router.get("/search-dish", HotelStarController.getAllDishes);

/* get Hotels And Dishes data */

router.get("/get-hotel-and-dishes", HotelStarController.getHotelsAndDishes);

module.exports = { hotelStarRoutes: router };
