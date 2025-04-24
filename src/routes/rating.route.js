const router = require("express").Router();
const ratingController = require("../controller/rating.controller");

// Submit a rating (authenticated users only)
router.post("/submit", ratingController.submitRating);

// Get ratings for a hotel (public)
router.get("/hotel/:hotelId", ratingController.getHotelRatings);

// Get ratings for a delivery boy (public)
router.get("/delivery-boy/:deliveryBoyId", ratingController.getDeliveryBoyRatings);

// Report a rating (authenticated users only)
router.post("/report/:ratingId", ratingController.reportRating);

// Get user's own ratings (authenticated users only)
router.get("/user", ratingController.getUserRatings);

module.exports = { ratingRoutes: router }; 