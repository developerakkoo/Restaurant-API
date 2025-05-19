const Order = require("../models/order.model");
const PartnerSettlement = require("../models/Partner-Settlements/partner-settlement");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { asyncHandler } = require("../utils/asyncHandler");

/**
 * @function getAdminEarnings
 * @async
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @description Calculates total admin earnings from platform fees, partner settlements, and GST
 */
exports.getAdminEarnings = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    // Create date filter
    const dateFilter = {};
    if (startDate && endDate) {
        dateFilter.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    // Calculate platform fees from orders
    const platformFees = await Order.aggregate([
        { $match: dateFilter },
        {
            $group: {
                _id: null,
                totalPlatformFees: { $sum: "$priceDetails.platformFee" },
                totalGST: { $sum: "$priceDetails.gstAmount" }
            }
        }
    ]);

    // Calculate admin earnings from partner settlements
    const partnerSettlements = await PartnerSettlement.aggregate([
        { $match: { ...dateFilter, isSettled: true } },
        {
            $group: {
                _id: null,
                totalAdminEarnings: { $sum: "$adminEarning" }
            }
        }
    ]);

    // Calculate earnings by date for chart
    const earningsByDate = await Order.aggregate([
        { $match: dateFilter },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                platformFees: { $sum: "$priceDetails.platformFee" },
                gstAmount: { $sum: "$priceDetails.gstAmount" }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Get partner settlements by date
    const settlementsByDate = await PartnerSettlement.aggregate([
        { $match: { ...dateFilter, isSettled: true } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$settledAt" } },
                adminEarnings: { $sum: "$adminEarning" }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Combine earnings data for chart
    const chartData = earningsByDate.map(earning => {
        const settlement = settlementsByDate.find(s => s._id === earning._id);
        return {
            date: earning._id,
            platformFees: earning.platformFees,
            gstAmount: earning.gstAmount,
            adminEarnings: settlement ? settlement.adminEarnings : 0,
            total: earning.platformFees + earning.gstAmount + (settlement ? settlement.adminEarnings : 0)
        };
    });

    const totalEarnings = {
        platformFees: platformFees[0]?.totalPlatformFees || 0,
        gstAmount: platformFees[0]?.totalGST || 0,
        adminEarnings: partnerSettlements[0]?.totalAdminEarnings || 0,
        total: (platformFees[0]?.totalPlatformFees || 0) + 
               (platformFees[0]?.totalGST || 0) + 
               (partnerSettlements[0]?.totalAdminEarnings || 0)
    };

    return res.status(200).json(
        new ApiResponse(200, {
            totalEarnings,
            chartData
        }, "Admin earnings calculated successfully")
    );
});

/**
 * @function getEarningsBreakdown
 * @async
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @description Gets detailed breakdown of admin earnings by category
 */
exports.getEarningsBreakdown = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate && endDate) {
        dateFilter.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    // Get platform fees by payment mode
    const platformFeesByPaymentMode = await Order.aggregate([
        { $match: dateFilter },
        {
            $group: {
                _id: "$paymentMode",
                total: { $sum: "$priceDetails.platformFee" },
                count: { $sum: 1 }
            }
        }
    ]);

    // Get GST collection by payment mode
    const gstByPaymentMode = await Order.aggregate([
        { $match: dateFilter },
        {
            $group: {
                _id: "$paymentMode",
                total: { $sum: "$priceDetails.gstAmount" },
                count: { $sum: 1 }
            }
        }
    ]);

    // Get admin earnings by hotel
    const adminEarningsByHotel = await PartnerSettlement.aggregate([
        { $match: { ...dateFilter, isSettled: true } },
        {
            $group: {
                _id: "$hotelId",
                total: { $sum: "$adminEarning" },
                count: { $sum: 1 }
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            platformFeesByPaymentMode,
            gstByPaymentMode,
            adminEarningsByHotel
        }, "Earnings breakdown retrieved successfully")
    );
}); 