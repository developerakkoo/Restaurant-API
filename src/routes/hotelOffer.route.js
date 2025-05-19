const router = require("express").Router();
const hotelOfferController = require("../controller/hotelOffer.controller");
const { verify_access_token } = require("../middleware/verifyJwtToken.middleware");

// Admin routes
router.post("/create", verify_access_token, hotelOfferController.createHotelOffer);
router.put("/update/:offerId", verify_access_token, hotelOfferController.updateHotelOffer);
router.delete("/delete/:offerId", verify_access_token, hotelOfferController.deleteHotelOffer);
router.get("/all-active", verify_access_token, hotelOfferController.getAllActiveOffers);

// Public routes
router.get("/hotel/:hotelId", hotelOfferController.getHotelOffers);

module.exports = { hotelOfferRoutes: router }; 