const DriverEarning = require('../../models/Delivery-Boy/driverEarnings');
const DriverSettings = require('../../models/Delivery-Boy/driverSettings');
const Order = require('../../models/order.model');
const PartnerSettlement = require('../../models/Partner-Settlements/partner-settlement');
const { createSettlement } = require('../Partner-Settlement/partner-settlement');
const { asyncHandler } = require('../../utils/asyncHandler');
const { ApiResponse } = require('../../utils/ApiResponseHandler');
const { ApiError } = require('../../utils/ApiErrorHandler');

/**
 * Internal function to create earning (can be called directly)
 * @param {string} driverId - Driver ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Created earning object
 */
const createEarningInternal = async (driverId, orderId) => {
  // Check if earning already exists (prevent duplicates)
  const existingEarning = await DriverEarning.findOne({
    driverId: driverId,
    orderId: orderId
  });

  if (existingEarning) {
    console.log(`⚠️ Earning already exists for order ${orderId} and driver ${driverId}`);
    return { existing: true, earning: existingEarning };
  }

  // Get driver settings
  const settings = await DriverSettings.findOne();
  if (!settings) {
    throw new ApiError(400, 'Driver settings not configured');
  }

  // Verify order exists and is delivered (status 3)
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.orderStatus !== 3) {
    throw new ApiError(400, `Order status must be 3 (Delivered). Current status: ${order.orderStatus}`);
  }

  // Get the highest delivery number for this driver to calculate the next sequential number
  // This ensures correct bonus calculation even if earnings are deleted
  const lastEarning = await DriverEarning.findOne({ driverId })
    .sort({ deliveryNumber: -1 })
    .select('deliveryNumber');
  
  const deliveryNumber = lastEarning && lastEarning.deliveryNumber 
    ? lastEarning.deliveryNumber + 1 
    : 1; // First delivery for this driver

  // Calculate bonus (only for 16th and 21st delivery)
  let bonus = 0;
  if (deliveryNumber === 16) {
    bonus = settings.bonus16thDelivery;
  } else if (deliveryNumber === 21) {
    bonus = settings.bonus21stDelivery;
  }

  // Calculate total amount
  const amount = settings.perDeliveryAmount + bonus;

  // Note: Partner settlement should already be created when order status changes to 3
  // This is handled in order.controller.js to ensure it's created even without a driver
  // We check here just to be safe, but it should already exist
  const settlement = await PartnerSettlement.findOne({ orderId });
  if (!settlement) {
    console.warn(`⚠️ Partner settlement not found for order ${orderId}, creating it now`);
    await createSettlement(order);
  }

  // Create earning record with sequential delivery number
  const earning = new DriverEarning({
    driverId,
    orderId,
    date: new Date(),
    amount,
    bonus,
    deliveryNumber,
  });

  await earning.save();
  console.log(`✅ Earning created: Driver ${driverId}, Order ${orderId}, Amount: ${amount}, Bonus: ${bonus}`);
  
  return { existing: false, earning };
};

/**
 * HTTP handler for creating earning
 */
exports.createEarning = asyncHandler(async (req, res) => {
  const { driverId, orderId } = req.body;

  if (!driverId || !orderId) {
    throw new ApiError(400, 'Driver ID and Order ID are required');
  }

  const result = await createEarningInternal(driverId, orderId);

  if (result.existing) {
    return res.status(200).json(
      new ApiResponse(200, result.earning, 'Earning already exists')
    );
  }

  return res.status(201).json(
    new ApiResponse(201, result.earning, 'Earning recorded successfully')
  );
});

// Export internal function for use in other controllers
exports.createEarningInternal = createEarningInternal;

exports.getDriverEarnings = asyncHandler(async (req, res) => {
  const { driverId, startDate, endDate, sortBy = 'date' } = req.query;
  const filter = {};

  if (driverId) filter.driverId = driverId;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const earnings = await DriverEarning.find(filter)
    .populate({
      path: 'orderId',
      select: 'orderId hotelId userId',
      populate: {
        path: 'hotelId',
        select: 'hotelName'
      }
    })
    .sort({ [sortBy]: -1 });

  return res.status(200).json(
    new ApiResponse(200, earnings, 'Earnings retrieved successfully')
  );
});

/**
 * Get Earnings Summary
 * Returns total, monthly, and today's earnings
 */
exports.getEarningsSummary = asyncHandler(async (req, res) => {
  const { driverId } = req.params;

  if (!driverId) {
    throw new ApiError(400, 'Driver ID is required');
  }

  const mongoose = require('mongoose');
  const { Types } = mongoose;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Convert driverId to ObjectId if it's a string
  const driverObjectId = Types.ObjectId.isValid(driverId) 
    ? (typeof driverId === 'string' ? new Types.ObjectId(driverId) : driverId)
    : driverId;

  // Calculate total earnings (all time)
  const totalEarningsResult = await DriverEarning.aggregate([
    { $match: { driverId: driverObjectId } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalEarnings = totalEarningsResult[0]?.total || 0;

  // Calculate monthly earnings (current month)
  const monthlyEarningsResult = await DriverEarning.aggregate([
    {
      $match: {
        driverId: driverObjectId,
        date: { $gte: startOfMonth }
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const monthlyEarnings = monthlyEarningsResult[0]?.total || 0;

  // Calculate today's earnings
  const todayEarningsResult = await DriverEarning.aggregate([
    {
      $match: {
        driverId: driverObjectId,
        date: { $gte: startOfToday }
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const todayEarnings = todayEarningsResult[0]?.total || 0;

  return res.status(200).json(
    new ApiResponse(200, {
      totalEarnings,
      monthlyEarnings,
      todayEarnings
    }, 'Earnings summary retrieved successfully')
  );
});

/**
 * Get Settlement Summary
 * Returns pending and settled amounts
 */
exports.getSettlementSummary = asyncHandler(async (req, res) => {
  const { driverId } = req.params;

  if (!driverId) {
    throw new ApiError(400, 'Driver ID is required');
  }

  const mongoose = require('mongoose');
  const { Types } = mongoose;
  const DriverSettlement = require('../../models/Delivery-Boy/driverSettlements');

  // Convert driverId to ObjectId if it's a string
  const driverObjectId = Types.ObjectId.isValid(driverId) 
    ? (typeof driverId === 'string' ? new Types.ObjectId(driverId) : driverId)
    : driverId;

  // Calculate pending settlement (unsettled earnings)
  const pendingResult = await DriverEarning.aggregate([
    {
      $match: {
        driverId: driverObjectId,
        isSettled: false
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const pendingSettlement = pendingResult[0]?.total || 0;

  // Calculate settled amount (from DriverSettlement records)
  const settledResult = await DriverSettlement.aggregate([
    {
      $match: {
        driverId: driverObjectId
      }
    },
    { $group: { _id: null, total: { $sum: '$amountPaid' } } }
  ]);
  const settledAmount = settledResult[0]?.total || 0;

  // Get total settlements count and last settlement date
  const settlements = await DriverSettlement.find({ driverId })
    .sort({ settlementDate: -1 })
    .limit(1);
  
  const totalSettlements = await DriverSettlement.countDocuments({ driverId });
  const lastSettlementDate = settlements[0]?.settlementDate || null;

  return res.status(200).json(
    new ApiResponse(200, {
      pendingSettlement,
      settledAmount,
      totalSettlements,
      lastSettlementDate
    }, 'Settlement summary retrieved successfully')
  );
});

/**
 * Get Earnings Statistics
 * Returns completed deliveries, average per delivery, total bonus, and breakdown
 */
exports.getEarningsStatistics = asyncHandler(async (req, res) => {
  const { driverId } = req.params;
  const { month, year } = req.query;

  if (!driverId) {
    throw new ApiError(400, 'Driver ID is required');
  }

  const now = new Date();
  const targetMonth = month ? parseInt(month) - 1 : now.getMonth(); // month is 0-indexed
  const targetYear = year ? parseInt(year) : now.getFullYear();
  const startOfMonth = new Date(targetYear, targetMonth, 1);
  const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  // Get earnings for the specified month
  const earnings = await DriverEarning.find({
    driverId,
    date: { $gte: startOfMonth, $lte: endOfMonth }
  }).sort({ date: 1 });

  const completedDeliveries = earnings.length;
  const totalAmount = earnings.reduce((sum, e) => sum + e.amount, 0);
  const totalBonus = earnings.reduce((sum, e) => sum + (e.bonus || 0), 0);
  const averagePerDelivery = completedDeliveries > 0 ? totalAmount / completedDeliveries : 0;

  // Breakdown by date
  const breakdown = earnings.reduce((acc, earning) => {
    const dateKey = earning.date.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = { date: dateKey, count: 0, amount: 0, bonus: 0 };
    }
    acc[dateKey].count += 1;
    acc[dateKey].amount += earning.amount;
    acc[dateKey].bonus += earning.bonus || 0;
    return acc;
  }, {});

  return res.status(200).json(
    new ApiResponse(200, {
      completedDeliveries,
      averagePerDelivery: Math.round(averagePerDelivery * 100) / 100, // Round to 2 decimal places
      totalBonus,
      breakdown: Object.values(breakdown)
    }, 'Earnings statistics retrieved successfully')
  );
});

/**
 * Get Recent Earnings
 * Returns recent earnings with populated order details
 */
exports.getRecentEarnings = asyncHandler(async (req, res) => {
  const { driverId } = req.params;
  const limit = parseInt(req.query.limit) || 10;

  if (!driverId) {
    throw new ApiError(400, 'Driver ID is required');
  }

  const earnings = await DriverEarning.find({ driverId })
    .populate({
      path: 'orderId',
      select: 'orderId hotelId userId',
      populate: [
        {
          path: 'hotelId',
          select: 'hotelName address'
        },
        {
          path: 'userId',
          select: 'name phoneNumber'
        }
      ]
    })
    .sort({ date: -1 })
    .limit(limit);

  // Format response
  const formattedEarnings = earnings.map(earning => ({
    _id: earning._id,
    orderId: earning.orderId?.orderId || 'N/A',
    hotelName: earning.orderId?.hotelId?.hotelName || 'N/A',
    date: earning.date,
    amount: earning.amount,
    bonus: earning.bonus || 0,
    isSettled: earning.isSettled
  }));

  return res.status(200).json(
    new ApiResponse(200, formattedEarnings, 'Recent earnings retrieved successfully')
  );
});
