const Favorite = require("../models/favorite.model");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { responseMessage } = require("../constant");

exports.addFavorite = asyncHandler(async (req, res) => {
    const { userId, dishId, hotelId } = req.body;
    // Check if either dishId or hotelId is provided
    if (!dishId && !hotelId) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    null,
                    "Either dishId or hotelId must be provided",
                ),
            );
    }

    let favorite;

    // If dishId is provided, check if the dish is already favorited
    if (dishId) {
        favorite = await Favorite.findOne({ userId, dishId });
        if (favorite) {
            return res
                .status(400)
                .json(
                    new ApiResponse(
                        400,
                        {},
                        responseMessage.userMessage.ALREADY_FAVORITED,
                    ),
                );
        }
        favorite = await Favorite.create({ userId, dishId });
    }

    // If hotelId is provided, check if the hotel is already favorited
    if (hotelId) {
        favorite = await Favorite.findOne({ userId, hotelId });
        if (favorite) {
            return res
                .status(400)
                .json(
                    new ApiResponse(
                        400,
                        {},
                        responseMessage.userMessage.ALREADY_FAVORITED,
                    ),
                );
        }
        favorite = await Favorite.create({ userId, hotelId });
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                favorite,
                responseMessage.userMessage.ADD_FAVORITED_SUCCESSFULLY,
            ),
        );
});

exports.removeFavorite = asyncHandler(async (req, res) => {
    const { userId, dishId, hotelId } = req.body;

    let favorite;

    // If dishId is provided, find the favorite dish
    if (dishId) {
        favorite = await Favorite.findOne({ userId, dishId });
        if (!favorite) {
            return res
                .status(400)
                .json(
                    new ApiResponse(
                        400,
                        null,
                        responseMessage.userMessage.NOT_FAVORITED,
                    ),
                );
        }
        await Favorite.deleteOne({ userId, dishId });
    }

    // If hotelId is provided, find the favorite hotel
    if (hotelId) {
        favorite = await Favorite.findOne({ userId, hotelId });
        if (!favorite) {
            return res
                .status(400)
                .json(
                    new ApiResponse(
                        400,
                        null,
                        responseMessage.userMessage.NOT_FAVORITED,
                    ),
                );
        }
        await Favorite.deleteOne({ userId, hotelId });
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                responseMessage.userMessage.removeFromFavorite,
            ),
        );
});

exports.getFavorite = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const favorites = await Favorite.findById(id)
        .populate({
            path: "dishId",
            select: "-partnerPrice",
        })
        .populate("hotelId");
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                favorites,
                responseMessage.userMessage.FAVORITED_SUCCESSFULLY,
            ),
        );
});

//TODO:  need all data like rating and all sam link get all dish and hotel
exports.getMyFavoritesList = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const favorites = await Favorite.find({ userId })
        .populate({
            path: "dishId",
            select: "-partnerPrice",
        })
        .populate({
            path: "hotelId",
            populate: {
                path: "category", // Populate the category field within hotelId
            },
        });
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                favorites,
                responseMessage.userMessage.FAVORITED_SUCCESSFULLY,
            ),
        );
});
