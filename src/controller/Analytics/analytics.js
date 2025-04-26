const DriverEarning = require('../../models/Delivery-Boy/driverEarnings');
const DriverSettlement = require('../../models/Delivery-Boy/driverSettlements');

exports.getDriverAnalytics = async (req, res) => {
  try {
    const { driverId } = req.query;

    const earningsAggregate = await DriverEarning.aggregate([
      { $match: { driverId: driverId ? mongoose.Types.ObjectId(driverId) : { $exists: true } } },
      {
        $group: {
          _id: "$driverId",
          totalEarnings: { $sum: "$amount" },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ["$isSettled", false] }, "$amount", 0]
            }
          },
          settledAmount: {
            $sum: {
              $cond: [{ $eq: ["$isSettled", true] }, "$amount", 0]
            }
          },
          totalDeliveries: { $sum: 1 },
          bonusesGiven: { $sum: "$bonus" },
        }
      }
    ]);

    const settlements = await DriverSettlement.find({ driverId });

    res.json({
      driverAnalytics: earningsAggregate[0] || {},
      settlements
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
