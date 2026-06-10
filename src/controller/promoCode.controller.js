const promoCode = require("../models/promoCode.model");
const Order = require("../models/order.model");
const { ApiError } = require("../utils/ApiErrorHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const {
    formatPromoExpiryForStorage,
    isPromoExpired,
    enrichPromoRecord,
    buildPromoNotificationMessage,
} = require("../utils/promoDate.util");
const { notifyCustomer } = require("../services/customerNotification.service");

function isCustomerPromoRequest(req) {
    return String(req.originalUrl || "").includes("/user/promoCode");
}

function normalizePromoPayload(body) {
    const payload = { ...body };

    if (payload.expiry != null && payload.expiry !== "") {
        payload.expiry = formatPromoExpiryForStorage(payload.expiry);
    }

    if (payload.isActive === undefined || payload.isActive === null) {
        payload.isActive = true;
    }

    if (payload.codeType != null) {
        payload.codeType = Number(payload.codeType);
    }

    if (payload.discountAmount != null) {
        payload.discountAmount = Number(payload.discountAmount);
    }

    if (payload.minOrderAmount != null) {
        payload.minOrderAmount = Number(payload.minOrderAmount);
    }

    return payload;
}

exports.addPromoCode = asyncHandler(async (req, res) => {
    const payload = normalizePromoPayload(req.body);
    const { name, code } = payload;

    const isCodExist = await promoCode.findOne({
        $or: [{ name }, { code }],
    });
    if (isCodExist) {
        throw new ApiError(
            400,
            "Promo code already exist with this name or code ",
        );
    }

    const createdPromoCode = await promoCode.create(payload);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                enrichPromoRecord(createdPromoCode),
                "Promo code added successfully",
            ),
        );
});

exports.updatedPromoCode = asyncHandler(async (req, res) => {
    const payload = normalizePromoPayload(req.body);

    const isCodExist = await promoCode.findById(req.params.promoCodeId);
    if (!isCodExist) {
        throw new ApiError(404, "Promo code not found");
    }

    const updatedPromoCode = await promoCode.findByIdAndUpdate(
        req.params.promoCodeId,
        { $set: payload },
        { new: true },
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                enrichPromoRecord(updatedPromoCode),
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
                enrichPromoRecord(isPromoCode),
                "Promo code fetched successfully",
            ),
        );
});

exports.getAllPromoCodes = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { isActive, codeType } = req.query;

    if (isActive !== undefined && isActive !== "") {
        dbQuery.isActive = isActive === "true" || isActive === true;
    }
    if (codeType) {
        dbQuery.codeType = Number(codeType);
    }

    let allPromoCodes = await promoCode.find(dbQuery).sort({ createdAt: -1 });

    if (isCustomerPromoRequest(req)) {
        allPromoCodes = allPromoCodes.filter(
            (promo) => promo.isActive && !isPromoExpired(promo.expiry),
        );
    }

    const enriched = allPromoCodes
        .map(enrichPromoRecord)
        .sort((a, b) => {
            if (a.isExpired !== b.isExpired) {
                return a.isExpired ? 1 : -1;
            }
            return String(b.expiry).localeCompare(String(a.expiry));
        });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                enriched,
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

exports.notifyPromoToUser = asyncHandler(async (req, res) => {
    const promo = await promoCode.findById(req.params.promoCodeId);
    if (!promo) {
        throw new ApiError(404, "Promo code not found");
    }

    if (!promo.isActive || isPromoExpired(promo.expiry)) {
        throw new ApiError(
            409,
            "Cannot send an inactive or expired promo code",
        );
    }

    const { userId } = req.body;
    if (!userId) {
        throw new ApiError(400, "userId is required");
    }

    const body = buildPromoNotificationMessage(promo);
    const result = await notifyCustomer(userId, {
        title: "Special offer for you!",
        body,
        type: "PROMO",
        extraData: {
            promoCode: String(promo.code).toUpperCase(),
            promoId: promo._id.toString(),
            codeType: String(promo.codeType),
            discountAmount: String(promo.discountAmount),
            minOrderAmount: String(promo.minOrderAmount),
            expiryDate: String(promo.expiry),
        },
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Promo notification sent successfully",
        ),
    );
});

exports.applyPromoCode = asyncHandler(async (req, res) => {
    const { code, orderAmount, userId } = req.body;

    const isPromoCodeExist = await promoCode.findOne({ code });
    if (!isPromoCodeExist || !isPromoCodeExist.isActive) {
        throw new ApiError(400, "Invalid promo code");
    }
    if (isPromoExpired(isPromoCodeExist.expiry)) {
        throw new ApiError(400, "Promo code expired");
    }

    if (orderAmount < isPromoCodeExist.minOrderAmount) {
        throw new ApiError(
            400,
            "Order total needs to be greater than the minimum order amount",
        );
    }

    let offer;
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
        case 3: {
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
        }
        default:
            throw new ApiError(400, "Invalid promo code type");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                isPromoCodeExist: enrichPromoRecord(isPromoCodeExist),
                offerYouGet: offer,
            },
            "Promo code applied successfully",
        ),
    );
});
