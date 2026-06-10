const moment = require("moment");
const { ApiError } = require("./ApiErrorHandler");

/** Business timezone for promo expiry (end of calendar day). */
const PROMO_TIMEZONE_OFFSET = "+05:30";

/**
 * Parse promo expiry from YYYY-MM-DD, DD-MM-YYYY, ISO, or Date.
 * @returns {moment.Moment|null} End of expiry calendar day (IST).
 */
function parsePromoExpiry(value) {
    if (value == null || value === "") {
        return null;
    }

    if (value instanceof Date) {
        const day = moment(value).utcOffset(PROMO_TIMEZONE_OFFSET).format("YYYY-MM-DD");
        return moment(`${day}T23:59:59.999${PROMO_TIMEZONE_OFFSET}`);
    }

    const str = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return moment(`${str}T23:59:59.999${PROMO_TIMEZONE_OFFSET}`);
    }

    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        const parsed = moment(str, "DD-MM-YYYY", true);
        if (!parsed.isValid()) {
            return null;
        }
        return moment(
            `${parsed.format("YYYY-MM-DD")}T23:59:59.999${PROMO_TIMEZONE_OFFSET}`,
        );
    }

    const iso = moment(str);
    if (iso.isValid()) {
        const day = iso.utcOffset(PROMO_TIMEZONE_OFFSET).format("YYYY-MM-DD");
        return moment(`${day}T23:59:59.999${PROMO_TIMEZONE_OFFSET}`);
    }

    return null;
}

/**
 * Normalize expiry for DB storage (YYYY-MM-DD).
 */
function formatPromoExpiryForStorage(value) {
    const end = parsePromoExpiry(value);
    if (!end) {
        throw new ApiError(400, "Invalid expiry date");
    }
    return end.format("YYYY-MM-DD");
}

function isPromoExpired(expiry) {
    const end = parsePromoExpiry(expiry);
    if (!end) {
        return true;
    }
    return moment().utcOffset(PROMO_TIMEZONE_OFFSET).isAfter(end);
}

function enrichPromoRecord(promo) {
    const obj =
        promo && typeof promo.toObject === "function"
            ? promo.toObject()
            : { ...promo };

    obj.isExpired = isPromoExpired(obj.expiry);
    obj.status = obj.isExpired ? "expired" : "active";
    return obj;
}

function buildPromoNotificationMessage(promo) {
    const code = String(promo.code || "").toUpperCase();
    const min = promo.minOrderAmount || 0;

    switch (Number(promo.codeType)) {
        case 1:
            return `Use code ${code} for free delivery on orders above ₹${min}. Order now!`;
        case 2:
            return `Use code ${code} to get ₹${promo.discountAmount} off on orders above ₹${min}.`;
        case 3:
            return `New user offer! Code ${code} — ₹${promo.discountAmount} off on orders above ₹${min}.`;
        default:
            return `Use promo code ${code} on your next order.`;
    }
}

module.exports = {
    parsePromoExpiry,
    formatPromoExpiryForStorage,
    isPromoExpired,
    enrichPromoRecord,
    buildPromoNotificationMessage,
};
