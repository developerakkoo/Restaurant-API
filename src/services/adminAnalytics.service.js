const moment = require("moment");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const Partner = require("../models/partner.model");
const DeliveryBoy = require("../models/deliveryBoy.model");
const PartnerSettlement = require("../models/Partner-Settlements/partner-settlement");
const userTrackModel = require("../models/userTrack.model");
const {
    buildOrderDateMatch,
    buildSettledDateMatch,
    previousPeriod,
    defaultRangeForGranularity,
    CANCELLED_STATUSES,
    DELIVERED_STATUS,
} = require("../utils/analyticsDateRange");

const ORDER_STATUS_LABELS = {
    0: "Received",
    1: "Being Prepared",
    2: "Delivery Assigned",
    3: "Delivered",
    4: "Accepted",
    5: "Cancelled by Hotel",
    6: "Pickup Confirmed",
    7: "Cancelled by Customer",
    8: "Rejected by Delivery Boy",
};

function buildChartGroupId(granularity) {
    const groupId = { year: { $year: "$createdAt" } };
    if (granularity === "month") {
        groupId.month = { $month: "$createdAt" };
    } else if (granularity === "day") {
        groupId.month = { $month: "$createdAt" };
        groupId.day = { $dayOfMonth: "$createdAt" };
    }
    return groupId;
}

function formatChartLabel(item, granularity) {
    if (granularity === "day") {
        return moment(`${item._id.year}-${item._id.month}-${item._id.day}`, "YYYY-M-D").format("DD MMM");
    }
    if (granularity === "month") {
        return moment(`${item._id.year}-${item._id.month}`, "YYYY-M").format("MMMM");
    }
    return `${item._id.year}`;
}

async function getDashboardKpis(dateMatch) {
    const orderFilter = dateMatch || {};
    const [
        totalOrders,
        totalDeliveredOrders,
        totalCanceledOrders,
        totalUsers,
        totalOnlineUsers,
        totalPartners,
        totalDeliveryBoys,
        totalRevenueAgg,
    ] = await Promise.all([
        Order.countDocuments(orderFilter),
        Order.countDocuments({ ...orderFilter, orderStatus: DELIVERED_STATUS }),
        Order.countDocuments({ ...orderFilter, orderStatus: { $in: CANCELLED_STATUSES } }),
        dateMatch.createdAt
            ? User.countDocuments({ createdAt: dateMatch.createdAt })
            : User.countDocuments(),
        User.countDocuments({ isOnline: true }),
        Partner.countDocuments({ status: 0 }),
        DeliveryBoy.countDocuments({ status: 2 }),
        Order.aggregate([
            { $match: orderFilter },
            {
                $group: {
                    _id: null,
                    sum_totalPrice: { $sum: "$priceDetails.totalAmountToPay" },
                },
            },
        ]),
    ]);

    return {
        totalOrders,
        totalDeliveredOrders,
        totalCanceledOrders,
        totalUsers,
        totalOnlineUsers,
        totalPartners,
        totalDeliveryBoys,
        totalRevenue:
            totalRevenueAgg.length > 0
                ? Number(totalRevenueAgg[0].sum_totalPrice.toFixed(2))
                : 0,
    };
}

async function getOrderChart(granularity, dateMatch) {
    const pipeline = [
        { $match: dateMatch },
        {
            $group: {
                _id: buildChartGroupId(granularity),
                orderCount: { $sum: 1 },
            },
        },
        {
            $sort: {
                "_id.year": 1,
                ...(granularity !== "year" && { "_id.month": 1 }),
                ...(granularity === "day" && { "_id.day": 1 }),
            },
        },
    ];

    const result = await Order.aggregate(pipeline);
    return {
        labels: result.map((item) => formatChartLabel(item, granularity)),
        data: result.map((item) => item.orderCount),
    };
}

async function getRevenueChart(granularity, dateMatch) {
    const pipeline = [
        { $match: dateMatch },
        {
            $group: {
                _id: buildChartGroupId(granularity),
                revenue: { $sum: "$priceDetails.totalAmountToPay" },
            },
        },
        {
            $sort: {
                "_id.year": 1,
                ...(granularity !== "year" && { "_id.month": 1 }),
                ...(granularity === "day" && { "_id.day": 1 }),
            },
        },
    ];

    const result = await Order.aggregate(pipeline);
    return {
        labels: result.map((item) => formatChartLabel(item, granularity)),
        label: result.map((item) => formatChartLabel(item, granularity)),
        data: result.map((item) => Number(item.revenue.toFixed(2))),
    };
}

async function getOrderStatusBreakdown(dateMatch) {
    const grouped = await Order.aggregate([
        { $match: dateMatch },
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);

    const byStatus = grouped.map((g) => ({
        status: g._id,
        count: g.count,
        label: ORDER_STATUS_LABELS[g._id] || `Status ${g._id}`,
    }));

    const cancellations = grouped
        .filter((g) => CANCELLED_STATUSES.includes(g._id))
        .map((g) => ({
            status: g._id,
            count: g.count,
            label: ORDER_STATUS_LABELS[g._id],
        }));

    return { byStatus, cancellations };
}

async function getAdminEarningsTotals(startDate, endDate) {
    const orderRange = buildOrderDateMatch(startDate, endDate);
    if (orderRange.error) {
        throw new Error(orderRange.error);
    }
    const settledRange = buildSettledDateMatch(startDate, endDate);

    const [platformFees, partnerSettlements, earningsByDate, settlementsByDate] = await Promise.all([
        Order.aggregate([
            { $match: orderRange.match },
            {
                $group: {
                    _id: null,
                    totalPlatformFees: { $sum: "$priceDetails.platformFee" },
                    totalGST: { $sum: "$priceDetails.gstAmount" },
                },
            },
        ]),
        PartnerSettlement.aggregate([
            { $match: { ...settledRange.match, isSettled: true } },
            {
                $group: {
                    _id: null,
                    totalAdminEarnings: { $sum: "$adminEarning" },
                },
            },
        ]),
        Order.aggregate([
            { $match: orderRange.match },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    platformFees: { $sum: "$priceDetails.platformFee" },
                    gstAmount: { $sum: "$priceDetails.gstAmount" },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        PartnerSettlement.aggregate([
            { $match: { ...settledRange.match, isSettled: true } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$settledAt" } },
                    adminEarnings: { $sum: "$adminEarning" },
                },
            },
            { $sort: { _id: 1 } },
        ]),
    ]);

    const chartData = earningsByDate.map((earning) => {
        const settlement = settlementsByDate.find((s) => s._id === earning._id);
        const adminEarnings = settlement ? settlement.adminEarnings : 0;
        return {
            date: earning._id,
            platformFees: earning.platformFees,
            gstAmount: earning.gstAmount,
            adminEarnings,
            total: earning.platformFees + earning.gstAmount + adminEarnings,
        };
    });

    const totalEarnings = {
        platformFees: platformFees[0]?.totalPlatformFees || 0,
        gstAmount: platformFees[0]?.totalGST || 0,
        adminEarnings: partnerSettlements[0]?.totalAdminEarnings || 0,
        total:
            (platformFees[0]?.totalPlatformFees || 0) +
            (platformFees[0]?.totalGST || 0) +
            (partnerSettlements[0]?.totalAdminEarnings || 0),
    };

    return { totalEarnings, chartData };
}

async function getTopPartners(startDate, endDate, limit = 10) {
    const range = buildOrderDateMatch(startDate, endDate);
    if (range.error) {
        throw new Error(range.error);
    }

    return Order.aggregate([
        { $match: range.match },
        {
            $group: {
                _id: "$hotelId",
                orderCount: { $sum: 1 },
                revenue: { $sum: "$priceDetails.totalAmountToPay" },
            },
        },
        {
            $lookup: {
                from: "hotels",
                localField: "_id",
                foreignField: "_id",
                as: "hotel",
            },
        },
        { $unwind: { path: "$hotel", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                hotelId: "$_id",
                hotelName: { $ifNull: ["$hotel.hotelName", "Unknown"] },
                orderCount: 1,
                revenue: { $round: ["$revenue", 2] },
            },
        },
        { $sort: { revenue: -1 } },
        { $limit: Math.min(Number(limit) || 10, 50) },
    ]);
}

async function getMostSellingDishes({ startDate, endDate, period = "monthly" }) {
    let matchStage;
    if (startDate && endDate) {
        const range = buildOrderDateMatch(startDate, endDate);
        if (range.error) {
            throw new Error(range.error);
        }
        matchStage = range.match;
    } else if (period === "daily") {
        matchStage = {
            createdAt: {
                $gte: moment().startOf("day").toDate(),
                $lte: moment().endOf("day").toDate(),
            },
        };
    } else if (period === "weekly") {
        matchStage = {
            createdAt: {
                $gte: moment().startOf("week").toDate(),
                $lte: moment().endOf("week").toDate(),
            },
        };
    } else {
        matchStage = {
            createdAt: {
                $gte: moment().startOf("month").toDate(),
                $lte: moment().endOf("month").toDate(),
            },
        };
    }

    return Order.aggregate([
        { $match: matchStage },
        { $unwind: "$products" },
        {
            $group: {
                _id: "$products.dishId",
                totalOrders: { $sum: "$products.quantity" },
            },
        },
        {
            $lookup: {
                from: "hoteldishes",
                localField: "_id",
                foreignField: "_id",
                as: "dish",
            },
        },
        { $unwind: "$dish" },
        {
            $project: {
                _id: 0,
                dish: 1,
                totalOrders: 1,
            },
        },
        { $sort: { totalOrders: -1 } },
        { $limit: 10 },
    ]);
}

async function getCustomerActivityChart({ sort = "month", startDate, endDate }) {
    let match = {};
    if (startDate && endDate) {
        const range = buildOrderDateMatch(startDate, endDate);
        if (range.error) {
            throw new Error(range.error);
        }
        match = range.match;
    }

    const groupId =
        sort === "year"
            ? { year: { $year: "$createdAt" } }
            : sort === "month"
              ? { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }
              : { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } };

    const pipeline = [
        { $match: match },
        { $group: { _id: groupId, userCount: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ];

    const rows = await userTrackModel.aggregate(pipeline);
    return rows.map((row) => ({
        year: row._id.year,
        month: row._id.month,
        day: row._id.day,
        userCount: row.userCount,
    }));
}

async function getRecentOrders({ startDate, endDate, limit = 5 }) {
    const matchStages = [];
    if (startDate && endDate) {
        const range = buildOrderDateMatch(startDate, endDate);
        if (range.error) {
            throw new Error(range.error);
        }
        matchStages.push({ $match: range.match });
    }

    const pipeline = [
        ...matchStages,
        { $sort: { createdAt: -1 } },
        { $limit: Math.min(Number(limit) || 5, 50) },
        {
            $lookup: {
                from: "hotels",
                localField: "hotelId",
                foreignField: "_id",
                as: "hotel",
            },
        },
        { $unwind: { path: "$hotel", preserveNullAndEmptyArrays: true } },
    ];

    return Order.aggregate(pipeline);
}

async function countSettlements({ isSettled, startDate, endDate }) {
    const query = { isSettled: isSettled === true || isSettled === "true" };
    if (startDate && endDate) {
        const range = buildSettledDateMatch(startDate, endDate);
        if (range.error) {
            throw new Error(range.error);
        }
        query.settledAt = range.match.settledAt;
    }
    return PartnerSettlement.countDocuments(query);
}

async function getSettlementAnalytics({ startDate, endDate }) {
    const match = { isSettled: true };
    if (startDate && endDate) {
        const range = buildSettledDateMatch(startDate, endDate);
        if (range.error) {
            throw new Error(range.error);
        }
        match.settledAt = range.match.settledAt;
    }

    const result = await PartnerSettlement.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalPartnerEarnings: { $sum: "$totalPartnerEarning" },
                totalAdminEarnings: { $sum: "$adminEarning" },
            },
        },
    ]);

    return result[0] || { totalPartnerEarnings: 0, totalAdminEarnings: 0 };
}

function computeReconciliation(kpis, orderChart, revenueChart, statusBreakdown) {
    const ordersChartSum = (orderChart.data || []).reduce((s, n) => s + n, 0);
    const revenueChartSum = Number(
        (revenueChart.data || []).reduce((s, n) => s + n, 0).toFixed(2)
    );
    const statusSum = (statusBreakdown.byStatus || []).reduce((s, row) => s + row.count, 0);
    const cancellationSum = (statusBreakdown.cancellations || []).reduce((s, row) => s + row.count, 0);

    const revenueDiff = Math.abs(revenueChartSum - (kpis.totalRevenue || 0));
    const passed =
        ordersChartSum === (kpis.totalOrders || 0) &&
        revenueDiff <= 0.01 &&
        statusSum === (kpis.totalOrders || 0) &&
        cancellationSum === (kpis.totalCanceledOrders || 0);

    return {
        ordersChartSum,
        revenueChartSum,
        statusSum,
        cancellationSum,
        passed,
    };
}

async function getAnalyticsSummary({ startDate, endDate, granularity = "day", includePrevious = true }) {
    let resolvedStart = startDate;
    let resolvedEnd = endDate;
    if (!resolvedStart || !resolvedEnd) {
        const defaults = defaultRangeForGranularity(granularity);
        resolvedStart = defaults.startDate;
        resolvedEnd = defaults.endDate;
    }

    const range = buildOrderDateMatch(resolvedStart, resolvedEnd);
    if (range.error) {
        return { error: range.error };
    }

    const sort = granularity === "year" ? "year" : granularity === "month" ? "month" : "day";

    const [kpis, orderChart, revenueChart, statusBreakdown, earnings] = await Promise.all([
        getDashboardKpis(range.match),
        getOrderChart(sort, range.match),
        getRevenueChart(sort, range.match),
        getOrderStatusBreakdown(range.match),
        getAdminEarningsTotals(range.startDate, range.endDate),
    ]);

    const reconciliation = computeReconciliation(kpis, orderChart, revenueChart, statusBreakdown);

    const summary = {
        period: {
            startDate: range.startDate,
            endDate: range.endDate,
            granularity: sort,
        },
        kpis: {
            ...kpis,
            platformFees: earnings.totalEarnings.platformFees,
            gstAmount: earnings.totalEarnings.gstAmount,
            adminEarnings: earnings.totalEarnings.adminEarnings,
        },
        charts: {
            orders: orderChart,
            revenue: revenueChart,
        },
        statusBreakdown,
        earnings,
        reconciliation,
    };

    if (includePrevious) {
        const prev = previousPeriod(range.startDate, range.endDate);
        if (prev) {
            const prevRange = buildOrderDateMatch(prev.startDate, prev.endDate);
            const [previousKpis, previousEarnings] = await Promise.all([
                getDashboardKpis(prevRange.match),
                getAdminEarningsTotals(prev.startDate, prev.endDate),
            ]);
            summary.period.previousPeriod = prev;
            summary.previousKpis = {
                ...previousKpis,
                platformFees: previousEarnings.totalEarnings.platformFees,
                gstAmount: previousEarnings.totalEarnings.gstAmount,
                adminEarnings: previousEarnings.totalEarnings.adminEarnings,
            };
        }
    }

    return summary;
}

module.exports = {
    ORDER_STATUS_LABELS,
    CANCELLED_STATUSES,
    DELIVERED_STATUS,
    getDashboardKpis,
    getOrderChart,
    getRevenueChart,
    getOrderStatusBreakdown,
    getAdminEarningsTotals,
    getTopPartners,
    getMostSellingDishes,
    getCustomerActivityChart,
    getRecentOrders,
    countSettlements,
    getSettlementAnalytics,
    computeReconciliation,
    getAnalyticsSummary,
};
