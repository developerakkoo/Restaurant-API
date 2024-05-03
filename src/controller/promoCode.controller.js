const moment = require("moment");
const promoCode = require("../models/promoCode.model");
const { ApiError } = require("../utils/ApiErrorHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { asyncHandler } = require("../utils/asyncHandler");

exports.addPromoCode = asyncHandler(async (req, res) => {
    const {
        name,
        code,
        codeType,
        discountAmount,
        minOrderAmount,
        description,
        expiry,
        isActive,
    } = req.body;

    const isCodExist = await promoCode.findOne({
        $or: [{ name, code }],
    });
    if (isCodExist)
        throw new ApiError(
            400,
            "Promo code already exist with this name or code ",
        );

    const createdPromoCode = await promoCode.create({
        name,
        code,
        codeType,
        discountAmount,
        minOrderAmount,
        description,
        expiry,
        isActive,
    });
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                createdPromoCode,
                "Promo code added successfully",
            ),
        );
});

exports.updatedPromoCode = asyncHandler(async (req, res) => {
    const {
        name,
        code,
        codeType,
        discountAmount,
        minOrderAmount,
        description,
        expiry,
        isActive,
    } = req.body;

    const isCodExist = await promoCode.findById(req.params.promoCodeId);
    if (!isCodExist) {
        throw new ApiError(404, "Promo code not found");
    }
    const updatedPromoCode = await promoCode.findByIdAndUpdate(
        req.params.promoCodeId,
        {
            $set: {
                name,
                code,
                codeType,
                discountAmount,
                minOrderAmount,
                description,
                expiry,
                isActive,
            },
        },
        {
            new: true,
        },
    );
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPromoCode,
                "Promo code updated successfully",
            ),
        );
});

exports.getPromoCode = asyncHandler(async (req, res) => {
    const { promoCodeId } = req.params;
    const isPromoCode = await promoCode.findById(promoCodeId);
    if (!isPromoCode) {
        throw new ApiError(404, "Promo code not found");
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                isPromoCode,
                "Promo code fetched successfully",
            ),
        );
});

exports.getAllPromoCodes = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { isActive, codeType } = req.query;

    if (isActive) dbQuery.isActive = isActive;
    if (codeType) dbQuery.codeType = codeType;

    const allPromoCodes = await promoCode.find(dbQuery);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                allPromoCodes,
                "All promo codes fetched successfully",
            ),
        );
});

exports.deletePromoCode = asyncHandler(async (req, res) => {
    const isPromoCode = await promoCode.findById(req.params.promoCodeId);
    if (!isPromoCode) {
        throw new ApiError(404, "Promo code not found");
    }
    await promoCode.findByIdAndDelete(req.params.promoCodeId);
    return res
        .status(200)
        .json(new ApiResponse(200, null, "Promo code deleted successfully"));
});

exports.applyPromoCode = asyncHandler(async (req, res) => {
    const { code, orderAmount, userId } = req.body;

    const isPromoCodeExist = await promoCode.findOne({ code });
    if (!isPromoCodeExist || !isPromoCodeExist.isActive) {
        throw new ApiError(400, "Invalid promo code");
    }
    if (
        moment(isPromoCodeExist.expiry, "DD-MM-YYYY").isBefore(
            moment(),
            "DD-MM-YYYY",
        )
    ) {
        throw new ApiError(400, "Promo code expired");
    }

    let offer;
    if (orderAmount < isPromoCodeExist.minOrderAmount) {
        throw new ApiError(
            400,
            "Order total needs to be greater than the minimum order amount",
        );
    }

    switch (isPromoCodeExist.codeType) {
        case 1:
            offer = {
                offer: `FREE_DELIVERY ${isPromoCodeExist.offer}`,
                offerData: isPromoCodeExist.offer,
            };
            break;
        case 2:
            offer = {
                offer: `GET_OFF ${isPromoCodeExist.offer}`,
                offerData: isPromoCodeExist.offer,
            };
            break;
        case 3:
            const userOrderExist = await Order.findOne({ userId });
            if (userOrderExist) {
                throw new ApiError(
                    400,
                    "This code is only valid on the first order",
                );
            }
            offer = {
                offer: `NEW_USER ${isPromoCodeExist.offer}`,
                offerData: isPromoCodeExist.offer,
            };
            break;
        default:
            throw new ApiError(400, "Invalid promo code type");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isPromoCodeExist, offerYouGet: offer },
                "Promo code applied successfully",
            ),
        );
});
