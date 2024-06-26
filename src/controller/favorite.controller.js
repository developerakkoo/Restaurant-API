const Favorite = require("../models/favorite.model");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { responseMessage } = require("../constant");

exports.addFavorite = asyncHandler(async (req, res) => {
    const { userId, dishId } = req.body;
    const favorite = await Favorite.findOne({ userId, dishId });
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
    const newFavorite = await Favorite.create({ userId, dishId });
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                favorite,
                responseMessage.userMessage.FAVORITED_SUCCESSFULLY,
            ),
        );
});

exports.removeFavorite = asyncHandler(async (req, res) => {
    const { userId, dishId } = req.body;
    const favorite = await Favorite.findOne({ userId, dishId });
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
    const favorites = await Favorite.findById(id).populate({
        path: "dishId",
        select: "-partnerPrice",
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

exports.getMyFavoritesList = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const favorites = await Favorite.find({ userId }).populate({
        path: "dishId",
        select: "-partnerPrice",
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
