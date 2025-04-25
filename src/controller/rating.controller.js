const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const Rating = require("../models/rating.model");
const Order = require("../models/order.model");
const { sendNotification } = require("./notification.controller");

// Submit a rating and review
exports.submitRating = asyncHandler(async (req, res) => {
    const {
        orderId,
        userId,
        foodRating,
        deliveryRating,
        restaurantRating,
        dishIds,
        review,
        images,
        isAnonymous,
    } = req.body;

    // Check if order exists and belongs to the user
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    // Check if rating already exists for this order
    const existingRating = await Rating.findOne({ orderId });
    if (existingRating) {
        throw new ApiError(400, "Rating already submitted for this order");
    }

    // Create new rating
    const rating = await Rating.create({
        orderId,
        userId,
        dishIds,
        hotelId: order.hotelId,
        deliveryBoyId: order.assignedDeliveryBoy,
        foodRating,
        deliveryRating,
        restaurantRating,
        review,
        images,
        isAnonymous,
    });

    // Send notifications
    if (order.hotelId) {
        sendNotification(
            order.hotelId,
            "New Rating Received",
            `Your restaurant received a new rating of ${restaurantRating} stars`
        );
    }

    if (order.assignedDeliveryBoy) {
        sendNotification(
            order.assignedDeliveryBoy,
            "New Rating Received",
            `You received a new delivery rating of ${deliveryRating} stars`
        );
    }

    return res
        .status(201)
        .json(new ApiResponse(201, rating, "Rating submitted successfully"));
});

// Get ratings for a hotel
exports.getHotelRatings = asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: [
            { path: "userId", select: "name profile_image" },
            { path: "deliveryBoyId", select: "firstName lastName" },
        ],
    };

    const ratings = await Rating.paginate(
        { hotelId, status: "active" },
        options
    );

    // Calculate average ratings
    const averageRatings = await Rating.aggregate([
        { $match: { hotelId: mongoose.Types.ObjectId(hotelId), status: "active" } },
        {
            $group: {
                _id: null,
                avgFoodRating: { $avg: "$foodRating" },
                avgRestaurantRating: { $avg: "$restaurantRating" },
                totalRatings: { $sum: 1 },
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            ratings: ratings.docs,
            pagination: {
                total: ratings.totalDocs,
                page: ratings.page,
                pages: ratings.totalPages,
            },
            averageRatings: averageRatings[0] || {
                avgFoodRating: 0,
                avgRestaurantRating: 0,
                totalRatings: 0,
            },
        }, "Hotel ratings retrieved successfully")
    );
});

// Get ratings for a delivery boy
exports.getDeliveryBoyRatings = asyncHandler(async (req, res) => {
    const { deliveryBoyId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: [
            { path: "userId", select: "name profile_image" },
            { path: "hotelId", select: "name" },
        ],
    };

    const ratings = await Rating.paginate(
        { deliveryBoyId, status: "active" },
        options
    );

    // Calculate average delivery rating
    const averageRating = await Rating.aggregate([
        { $match: { deliveryBoyId: mongoose.Types.ObjectId(deliveryBoyId), status: "active" } },
        {
            $group: {
                _id: null,
                avgDeliveryRating: { $avg: "$deliveryRating" },
                totalRatings: { $sum: 1 },
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            ratings: ratings.docs,
            pagination: {
                total: ratings.totalDocs,
                page: ratings.page,
                pages: ratings.totalPages,
            },
            averageRating: averageRating[0] || {
                avgDeliveryRating: 0,
                totalRatings: 0,
            },
        }, "Delivery boy ratings retrieved successfully")
    );
});

// Report a rating
exports.reportRating = asyncHandler(async (req, res) => {
    const { ratingId } = req.params;
    const { reason } = req.body;

    const rating = await Rating.findByIdAndUpdate(
        ratingId,
        { status: "reported", reportReason: reason },
        { new: true }
    );

    if (!rating) {
        throw new ApiError(404, "Rating not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, rating, "Rating reported successfully"));
});

// Get user's ratings
exports.getUserRatings = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: [
            { path: "hotelId", select: "name" },
            { path: "deliveryBoyId", select: "firstName lastName" },
        ],
    };

    const ratings = await Rating.paginate(
        { userId, status: "active" },
        options
    );

    return res.status(200).json(
        new ApiResponse(200, {
            ratings: ratings.docs,
            pagination: {
                total: ratings.totalDocs,
                page: ratings.page,
                pages: ratings.totalPages,
            },
        }, "User ratings retrieved successfully")
    );
});

// Get reported ratings (Admin only)
exports.getReportedRatings = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: [
            { path: "userId", select: "name profile_image" },
            { path: "hotelId", select: "name" },
            { path: "deliveryBoyId", select: "firstName lastName" },
        ],
    };

    const ratings = await Rating.paginate(
        { status: "reported" },
        options
    );

    return res.status(200).json(
        new ApiResponse(200, {
            ratings: ratings.docs,
            pagination: {
                total: ratings.totalDocs,
                page: ratings.page,
                pages: ratings.totalPages,
            },
        }, "Reported ratings retrieved successfully")
    );
});

// Update rating status (Admin only)
exports.updateRatingStatus = asyncHandler(async (req, res) => {
    const { ratingId } = req.params;
    const { status } = req.body;

    if (!["active", "deleted"].includes(status)) {
        throw new ApiError(400, "Invalid status");
    }

    const rating = await Rating.findByIdAndUpdate(
        ratingId,
        { status },
        { new: true }
    );

    if (!rating) {
        throw new ApiError(404, "Rating not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, rating, "Rating status updated successfully"));
});

// Delete rating (Admin only)
exports.deleteRating = asyncHandler(async (req, res) => {
    const { ratingId } = req.params;

    const rating = await Rating.findByIdAndDelete(ratingId);

    if (!rating) {
        throw new ApiError(404, "Rating not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Rating deleted successfully"));
});

// Get rating statistics (Admin only)
exports.getRatingStatistics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const matchStage = { status: "active" };
    if (startDate && endDate) {
        matchStage.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
        };
    }

    const statistics = await Rating.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalRatings: { $sum: 1 },
                avgFoodRating: { $avg: "$foodRating" },
                avgDeliveryRating: { $avg: "$deliveryRating" },
                avgRestaurantRating: { $avg: "$restaurantRating" },
                ratingDistribution: {
                    $push: {
                        foodRating: "$foodRating",
                        deliveryRating: "$deliveryRating",
                        restaurantRating: "$restaurantRating",
                    },
                },
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(200, statistics[0] || {
            totalRatings: 0,
            avgFoodRating: 0,
            avgDeliveryRating: 0,
            avgRestaurantRating: 0,
            ratingDistribution: [],
        }, "Rating statistics retrieved successfully")
    );
}); 