const PartnerSettlement = require('../../models/Partner-Settlements/partner-settlement');
const HotelDish = require('../../models/hotelDish.model');

// Create Partner Settlements
exports.createSettlement = async (orderData) => {
  try {
    const settlements = [];

    for (const item of orderData.products) {
      const dish = await HotelDish.findById(item.dishId);

      if (dish) {
        settlements.push({
          hotelId: orderData.hotelId,
          orderId: orderData._id,
          dishId: dish._id,
          quantity: item.quantity,
          partnerPrice: dish.partnerPrice,
          totalPartnerEarning: dish.partnerPrice * item.quantity,
          adminEarning: (dish.userPrice - dish.partnerPrice) * item.quantity,
        });
      }
    }
    console.log(settlements);

    await PartnerSettlement.insertMany(settlements);
  } catch (error) {
    console.error('Error creating settlements:', error);
  }
};

// Fetch All Settlements - FULL POPULATE
exports.getSettlements = async (req, res) => {
  try {
    const { hotelId, isSettled } = req.query;
    const query = {};

    if (hotelId) query.hotelId = hotelId;
    if (isSettled !== undefined) query.isSettled = isSettled === 'true';

    const settlements = await PartnerSettlement.find(query)
      .populate({
        path: 'hotelId',
        select: 'hotelName ownerName' // Choose hotel fields you want
      })
      .populate({
        path: 'dishId',
        select: 'name dishType' // Choose dish fields
      })
      .populate({
        path: 'orderId',
        select: 'orderId userId paymentStatus' // Choose order fields
      })
      .sort({ settledAt: -1 });

    res.json({ success: true, data: settlements });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Mark Multiple Settlements as Settled
exports.markAsSettled = async (req, res) => {
  try {
    const { settlementIds } = req.body; // array of settlement _id

    await PartnerSettlement.updateMany(
      { _id: { $in: settlementIds }, isSettled: false },
      { isSettled: true, settledAt: new Date() }
    );

    res.json({ success: true, message: 'Settlements marked as settled' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Analytics for Admin
exports.getEarningsAnalytics = async (req, res) => {
  try {
    const result = await PartnerSettlement.aggregate([
      {
        $group: {
          _id: null,
          totalPartnerEarnings: { $sum: "$totalPartnerEarning" },
          totalAdminEarnings: { $sum: "$adminEarning" },
        }
      }
    ]);

    res.json({ success: true, data: result[0] || { totalPartnerEarnings: 0, totalAdminEarnings: 0 } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
