const { ApiResponse } = require("../utils/ApiResponseHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const adminAnalytics = require("../services/adminAnalytics.service");
const Order = require("../models/order.model");
const PartnerSettlement = require("../models/Partner-Settlements/partner-settlement");
const { buildOrderDateMatch, buildSettledDateMatch } = require("../utils/analyticsDateRange");

/**
 * @function getAdminEarnings
 * @description Calculates total admin earnings from platform fees, partner settlements, and GST
 */
exports.getAdminEarnings = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json(new ApiResponse(400, null, "startDate and endDate are required"));
    }

    const earnings = await adminAnalytics.getAdminEarningsTotals(startDate, endDate);

    return res.status(200).json(
        new ApiResponse(200, earnings, "Admin earnings calculated successfully")
    );
});

/**
 * @function getEarningsBreakdown
 * @description Gets detailed breakdown of admin earnings by category
 */
exports.getEarningsBreakdown = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json(new ApiResponse(400, null, "startDate and endDate are required"));
    }

    const orderRange = buildOrderDateMatch(startDate, endDate);
    if (orderRange.error) {
        return res.status(400).json(new ApiResponse(400, null, orderRange.error));
    }
    const settledRange = buildSettledDateMatch(startDate, endDate);

    const [platformFeesByPaymentMode, gstByPaymentMode, adminEarningsByHotel] = await Promise.all([
        Order.aggregate([
            { $match: orderRange.match },
            {
                $group: {
                    _id: "$paymentMode",
                    total: { $sum: "$priceDetails.platformFee" },
                    count: { $sum: 1 },
                },
            },
        ]),
        Order.aggregate([
            { $match: orderRange.match },
            {
                $group: {
                    _id: "$paymentMode",
                    total: { $sum: "$priceDetails.gstAmount" },
                    count: { $sum: 1 },
                },
            },
        ]),
        PartnerSettlement.aggregate([
            { $match: { ...settledRange.match, isSettled: true } },
            {
                $group: {
                    _id: "$hotelId",
                    total: { $sum: "$adminEarning" },
                    count: { $sum: 1 },
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
                    _id: 1,
                    total: 1,
                    count: 1,
                    hotelName: { $ifNull: ["$hotel.hotelName", "Unknown"] },
                },
            },
        ]),
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            platformFeesByPaymentMode,
            gstByPaymentMode,
            adminEarningsByHotel,
        }, "Earnings breakdown retrieved successfully")
    );
});
