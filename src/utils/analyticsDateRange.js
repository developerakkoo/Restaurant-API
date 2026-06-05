const moment = require("moment");

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LEGACY_DATE = /^\d{2}-\d{2}-\d{4}$/;

/**
 * Parse a date string as YYYY-MM-DD or DD-MM-YYYY.
 * @returns {moment.Moment|null}
 */
function parseAnalyticsDate(dateStr) {
    if (!dateStr || typeof dateStr !== "string") {
        return null;
    }
    const trimmed = dateStr.trim();
    if (ISO_DATE.test(trimmed)) {
        const parsed = moment(trimmed, "YYYY-MM-DD", true);
        return parsed.isValid() ? parsed : null;
    }
    if (LEGACY_DATE.test(trimmed)) {
        const parsed = moment(trimmed, "DD-MM-YYYY", true);
        return parsed.isValid() ? parsed : null;
    }
    return null;
}

/**
 * Build inclusive createdAt range for MongoDB queries.
 */
function buildOrderDateMatch(startDate, endDate) {
    const start = parseAnalyticsDate(startDate);
    const end = parseAnalyticsDate(endDate);

    if (!start || !end) {
        return { error: "Invalid date format. Use YYYY-MM-DD or DD-MM-YYYY." };
    }
    if (end.isBefore(start, "day")) {
        return { error: "End date must be on or after start date." };
    }

    return {
        match: {
            createdAt: {
                $gte: start.clone().startOf("day").toDate(),
                $lte: end.clone().endOf("day").toDate(),
            },
        },
        startDate: start.format("YYYY-MM-DD"),
        endDate: end.format("YYYY-MM-DD"),
    };
}

/**
 * Build settledAt range for partner settlements.
 */
function buildSettledDateMatch(startDate, endDate) {
    const built = buildOrderDateMatch(startDate, endDate);
    if (built.error) {
        return built;
    }
    return {
        match: {
            settledAt: built.match.createdAt,
        },
        startDate: built.startDate,
        endDate: built.endDate,
    };
}

/**
 * Previous period of equal length ending the day before startDate.
 */
function previousPeriod(startDate, endDate) {
    const start = parseAnalyticsDate(startDate);
    const end = parseAnalyticsDate(endDate);
    if (!start || !end) {
        return null;
    }
    const days = end.diff(start, "day") + 1;
    const previousEnd = start.clone().subtract(1, "day");
    const previousStart = previousEnd.clone().subtract(days - 1, "day");
    return {
        startDate: previousStart.format("YYYY-MM-DD"),
        endDate: previousEnd.format("YYYY-MM-DD"),
    };
}

function defaultRangeForGranularity(granularity = "day") {
    const today = moment();
    if (granularity === "year") {
        return {
            startDate: today.clone().startOf("year").format("YYYY-MM-DD"),
            endDate: today.clone().endOf("year").format("YYYY-MM-DD"),
        };
    }
    if (granularity === "month") {
        return {
            startDate: today.clone().startOf("year").format("YYYY-MM-DD"),
            endDate: today.clone().endOf("year").format("YYYY-MM-DD"),
        };
    }
    return {
        startDate: today.clone().startOf("month").format("YYYY-MM-DD"),
        endDate: today.clone().endOf("month").format("YYYY-MM-DD"),
    };
}

module.exports = {
    parseAnalyticsDate,
    buildOrderDateMatch,
    buildSettledDateMatch,
    previousPeriod,
    defaultRangeForGranularity,
    CANCELLED_STATUSES: [5, 7, 8],
    DELIVERED_STATUS: 3,
};
