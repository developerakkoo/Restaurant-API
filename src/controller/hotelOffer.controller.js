const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const HotelOffer = require("../models/hotelOffer.model");
const Hotel = require("../models/hotel.model");

// Create a new offer for a hotel
exports.createHotelOffer = asyncHandler(async (req, res) => {
    const {
        hotelId,
        offerType,
        offerValue,
        minOrderAmount,
        maxDiscount,
        startDate,
        endDate,
        description,
    } = req.body;

    // Check if hotel exists
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
        throw new ApiError(404, "Hotel not found");
    }

    // Create the offer
    const offer = await HotelOffer.create({
        hotelId,
        offerType,
        offerValue,
        minOrderAmount,
        maxDiscount,
        startDate,
        endDate,
        description,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, offer, "Hotel offer created successfully"));
});

// Get active offers for a hotel
exports.getHotelOffers = asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const currentDate = new Date();

    const offers = await HotelOffer.find({
        hotelId,
        isActive: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, offers, "Hotel offers retrieved successfully"));
});

// Update a hotel offer
exports.updateHotelOffer = asyncHandler(async (req, res) => {
    const { offerId } = req.params;
    const updateData = req.body;

    const offer = await HotelOffer.findByIdAndUpdate(
        offerId,
        { $set: updateData },
        { new: true }
    );

    if (!offer) {
        throw new ApiError(404, "Offer not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, offer, "Hotel offer updated successfully"));
});

// Delete a hotel offer
exports.deleteHotelOffer = asyncHandler(async (req, res) => {
    const { offerId } = req.params;

    const offer = await HotelOffer.findByIdAndDelete(offerId);

    if (!offer) {
        throw new ApiError(404, "Offer not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Hotel offer deleted successfully"));
});

// Get all active offers (Admin)
exports.getAllActiveOffers = asyncHandler(async (req, res) => {
    const currentDate = new Date();

    const offers = await HotelOffer.find({
        isActive: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
    }).populate("hotelId", "hotelName address");

    return res
        .status(200)
        .json(new ApiResponse(200, offers, "All active offers retrieved successfully"));
}); 