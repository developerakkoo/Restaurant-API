const { getDistance } = require("../utils/getDistance.utils");
const { ApiError } = require("../utils/ApiErrorHandler");
const { isPromoExpired } = require("../utils/promoDate.util");

const FREE_DELIVERY_ABOVE = 500;

/**
 * Flat delivery price from admin distance tiers.
 */
function selectDeliveryTierPrice(distanceInKm, config) {
    if (!config) {
        return { deliveryCharges: 0, deliveryBoyCompensationAmount: 0 };
    }

    let deliveryCharges = config.range3Price;
    let deliveryBoyCompensationAmount = config.range3Price;

    if (
        distanceInKm >= config.range1MinKm &&
        distanceInKm <= config.range1MaxKm
    ) {
        deliveryCharges = config.range1Price;
        deliveryBoyCompensationAmount = config.range1Price;
    } else if (
        distanceInKm > config.range2MinKm &&
        distanceInKm <= config.range2MaxKm
    ) {
        deliveryCharges = config.range2Price;
        deliveryBoyCompensationAmount = config.range2Price;
    } else if (
        distanceInKm > config.range3MinKm &&
        distanceInKm <= config.range3MaxKm
    ) {
        deliveryCharges = config.range3Price;
        deliveryBoyCompensationAmount = config.range3Price;
    }

    return { deliveryCharges, deliveryBoyCompensationAmount };
}

/**
 * GeoJSON coordinates are [lng, lat].
 */
function geoCoordsToLatLng(coords) {
    if (!coords || coords.length < 2) {
        return null;
    }
    return { lat: coords[1], lng: coords[0] };
}

async function resolveSubtotalFromProducts(products, dishModel) {
    if (!products || products.length === 0) {
        return 0;
    }

    const lineTotals = await Promise.all(
        products.map(async (product) => {
            const dish = await dishModel.findById(product.dishId);
            if (!dish) {
                throw new ApiError(400, "Invalid dish in cart");
            }
            return dish.userPrice * product.quantity;
        }),
    );

    return lineTotals.reduce((sum, price) => sum + price, 0);
}

/**
 * Items Total + delivery + handling (platform %) + round-off.
 * GST is stored as 0 — not part of the customer-facing total formula.
 */
function buildBreakdown({
    subtotal,
    distanceInKm,
    deliveryConfig,
    platformData,
    promoCode,
    userId,
    userOrderExists,
}) {
    const platformFeePercent = platformData?.platformFee ?? 0;
    const deliveryBoyAllowance = platformData?.deliveryBoyAllowance ?? 0;

    let { deliveryCharges, deliveryBoyCompensationAmount } =
        selectDeliveryTierPrice(distanceInKm, deliveryConfig);

    if (subtotal >= FREE_DELIVERY_ABOVE) {
        deliveryCharges = 0;
        deliveryBoyCompensationAmount = 0;
    }

    const platformFee = Number(
        ((subtotal * platformFeePercent) / 100).toFixed(2),
    );

    let totalBeforeRoundOff = subtotal + deliveryCharges + platformFee;

    let discount = 0;
    let promoCodeId = null;
    let promoCodeDetails = null;
    let promoCodeData = null;
    let displayDeliveryCharges = deliveryCharges;

    if (promoCode) {
        switch (promoCode.codeType) {
            case 1:
                discount = deliveryCharges;
                promoCodeDetails = "FREE_DELIVERY";
                totalBeforeRoundOff -= deliveryCharges;
                displayDeliveryCharges = 0;
                break;
            case 2:
                discount = promoCode.discountAmount;
                promoCodeDetails = "GET_OFF";
                totalBeforeRoundOff -= promoCode.discountAmount;
                break;
            case 3:
                if (userOrderExists) {
                    throw new ApiError(
                        400,
                        "This code is only valid on the first order",
                    );
                }
                discount = promoCode.discountAmount;
                promoCodeDetails = "NEW_USER";
                totalBeforeRoundOff -= promoCode.discountAmount;
                break;
            default:
                throw new ApiError(400, "Invalid promo code type");
        }

        promoCodeId = promoCode._id;
        promoCodeData = promoCode;
    }

    if (totalBeforeRoundOff < 0) {
        totalBeforeRoundOff = 0;
    }

    const totalAmountToPay = Math.ceil(totalBeforeRoundOff);
    const roundOffValue = Number(
        (totalAmountToPay - totalBeforeRoundOff).toFixed(2),
    );

    return {
        subtotal,
        gstAmount: 0,
        distanceInKm,
        deliveryCharges: displayDeliveryCharges,
        platformFee,
        discount,
        total: Number(totalBeforeRoundOff.toFixed(2)),
        roundOffValue,
        totalAmountToPay,
        promoCodeId,
        promoCodeDetails: promoCodeData,
        deliveryBoyCompensation:
            deliveryBoyCompensationAmount + deliveryBoyAllowance,
    };
}

async function validatePromoCode(promoCodeModel, code, subtotal, userId, Order) {
    if (!code) {
        return { promoCode: null, userOrderExists: false };
    }

    const promoCode = await promoCodeModel.findOne({ code });
    if (!promoCode || !promoCode.isActive) {
        throw new ApiError(400, "Invalid promo code");
    }
    if (isPromoExpired(promoCode.expiry)) {
        throw new ApiError(400, "Promo code expired");
    }
    if (subtotal < promoCode.minOrderAmount) {
        throw new ApiError(
            400,
            "Order total needs to be greater than the minimum order amount",
        );
    }

    let userOrderExists = false;
    if (promoCode.codeType === 3 && userId) {
        userOrderExists = Boolean(await Order.findOne({ userId }));
    }

    return { promoCode, userOrderExists };
}

async function calculateOrderPricing({
    products,
    userLat,
    userLong,
    shopLat,
    shopLong,
    code,
    userId,
    dishModel,
    deliveryChargesModel,
    Data,
    promoCodeModel,
    Order,
}) {
    const platformData = await Data.findOne();
    if (!platformData) {
        throw new ApiError(500, "Server error: Missing configuration data");
    }

    const deliveryConfig = await deliveryChargesModel.findOne();
    if (!deliveryConfig) {
        throw new ApiError(500, "Server error: Missing delivery charge config");
    }

    const subtotal = await resolveSubtotalFromProducts(products, dishModel);
    if (subtotal <= 0) {
        throw new ApiError(400, "Your cart is empty.");
    }

    const distanceInKm = getDistance(userLat, userLong, shopLat, shopLong);

    const { promoCode, userOrderExists } = await validatePromoCode(
        promoCodeModel,
        code,
        subtotal,
        userId,
        Order,
    );

    return buildBreakdown({
        subtotal,
        distanceInKm,
        deliveryConfig,
        platformData,
        promoCode,
        userId,
        userOrderExists,
    });
}

function priceDetailsMatch(clientDetails, serverDetails, tolerance = 1) {
    const fields = [
        "subtotal",
        "deliveryCharges",
        "platformFee",
        "total",
        "totalAmountToPay",
    ];

    return fields.every((field) => {
        const clientVal = Number(clientDetails?.[field] ?? 0);
        const serverVal = Number(serverDetails?.[field] ?? 0);
        return Math.abs(clientVal - serverVal) <= tolerance;
    });
}

module.exports = {
    FREE_DELIVERY_ABOVE,
    selectDeliveryTierPrice,
    geoCoordsToLatLng,
    resolveSubtotalFromProducts,
    buildBreakdown,
    validatePromoCode,
    calculateOrderPricing,
    priceDetailsMatch,
};
