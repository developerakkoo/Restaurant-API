const DriverEarning = require('../../models/Delivery-Boy/driverEarnings');
const DriverSettlement = require('../../models/Delivery-Boy/driverSettlements');
const { asyncHandler } = require('../../utils/asyncHandler');
const { ApiResponse } = require('../../utils/ApiResponseHandler');
const { ApiError } = require('../../utils/ApiErrorHandler');

exports.settleDriver = asyncHandler(async (req, res) => {
  const { driverId, earningIds, note } = req.body;

  if (!driverId || !earningIds || !Array.isArray(earningIds) || earningIds.length === 0) {
    throw new ApiError(400, 'Driver ID and earning IDs array are required');
  }

  // Check if earnings are already settled
  const earnings = await DriverEarning.find({ 
    _id: { $in: earningIds }, 
    driverId 
  });

  if (!earnings.length) {
    throw new ApiError(404, 'No earnings found to settle');
  }

  // Check if any earnings are already settled
  const alreadySettled = earnings.filter(e => e.isSettled);
  if (alreadySettled.length > 0) {
    throw new ApiError(400, `Some earnings are already settled: ${alreadySettled.map(e => e._id).join(', ')}`);
  }

  const amountPaid = earnings.reduce((total, earning) => total + earning.amount, 0);

  const settlement = new DriverSettlement({
    driverId,
    settlementDate: new Date(),
    amountPaid,
    ordersSettled: earningIds,
    note: note || '',
  });

  await settlement.save();

  // Mark earnings as settled
  await DriverEarning.updateMany(
    { _id: { $in: earningIds } }, 
    { $set: { isSettled: true } }
  );

  // Populate settlement for response
  const populatedSettlement = await DriverSettlement.findById(settlement._id)
    .populate({
      path: 'ordersSettled',
      populate: {
        path: 'orderId',
        select: 'orderId hotelId',
        populate: {
          path: 'hotelId',
          select: 'hotelName'
        }
      }
    })
    .populate({
      path: 'driverId',
      select: 'firstName lastName phoneNumber profile_image'
    });

  return res.status(201).json(
    new ApiResponse(201, populatedSettlement, 'Driver settled successfully')
  );
});

exports.getSettlements = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const { driverId: routeDriverId } = req.params;
  const { driverId: queryDriverId } = req.query;
  const mongoose = require('mongoose');
  const { Types } = mongoose;
  const filter = {};

  // Handle both query param and route param (route param takes precedence)
  const driverId = routeDriverId || queryDriverId;
  if (driverId) {
    // Convert driverId to ObjectId if it's a valid ObjectId string
    filter.driverId = Types.ObjectId.isValid(driverId) 
      ? (typeof driverId === 'string' ? new Types.ObjectId(driverId) : driverId)
      : driverId;
    console.log(`🔍 [getSettlements] Filtering by driverId: ${driverId} (converted to ObjectId: ${filter.driverId})`);
  }
  
  if (startDate || endDate) {
    filter.settlementDate = {};
    if (startDate) filter.settlementDate.$gte = new Date(startDate);
    if (endDate) filter.settlementDate.$lte = new Date(endDate);
  }

  console.log(`🔍 [getSettlements] Query filter:`, JSON.stringify(filter, null, 2));
  
  const settlements = await DriverSettlement.find(filter)
    .populate({
      path: 'ordersSettled',
      populate: {
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
      }
    })
    .populate({
      path: 'driverId',
      select: 'firstName lastName phoneNumber profile_image',
      model: 'deliveryBoy'
    })
    .sort({ settlementDate: -1 });

  console.log(`✅ [getSettlements] Found ${settlements.length} settlements for driver ${driverId}`);

  return res.status(200).json(
    new ApiResponse(200, settlements, 'Settlements retrieved successfully')
  );
});

/**
 * Get Settlement Details
 * Returns single settlement with full details
 */
exports.getSettlementDetails = asyncHandler(async (req, res) => {
  const { settlementId } = req.params;

  if (!settlementId) {
    throw new ApiError(400, 'Settlement ID is required');
  }

  const settlement = await DriverSettlement.findById(settlementId)
    .populate({
      path: 'ordersSettled',
      populate: {
        path: 'orderId',
        select: 'orderId hotelId userId createdAt',
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
      }
    })
    .populate({
      path: 'driverId',
      select: 'firstName lastName phoneNumber profile_image',
      model: 'deliveryBoy'
    });

  if (!settlement) {
    throw new ApiError(404, 'Settlement not found');
  }

  return res.status(200).json(
    new ApiResponse(200, settlement, 'Settlement details retrieved successfully')
  );
});
