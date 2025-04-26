const DriverEarning = require('../../models/Delivery-Boy/driverEarnings');
const DriverSettlement = require('../../models/Delivery-Boy/driverSettlements');

exports.settleDriver = async (req, res) => {
  try {
    const { driverId, earningIds, note } = req.body;

    const earnings = await DriverEarning.find({ _id: { $in: earningIds }, driverId });

    if (!earnings.length) {
      return res.status(404).json({ message: 'No earnings found to settle' });
    }

    const amountPaid = earnings.reduce((total, earning) => total + earning.amount, 0);

    const settlement = new DriverSettlement({
      driverId,
      settlementDate: new Date(),
      amountPaid,
      ordersSettled: earningIds,
      note,
    });

    await settlement.save();

    await DriverEarning.updateMany({ _id: { $in: earningIds } }, { isSettled: true });

    res.status(201).json({ message: 'Driver settled successfully', settlement });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getSettlements = async (req, res) => {
  try {
    const { driverId, startDate, endDate } = req.query;
    const filter = {};

    if (driverId) filter.driverId = driverId;
    if (startDate || endDate) {
      filter.settlementDate = {};
      if (startDate) filter.settlementDate.$gte = new Date(startDate);
      if (endDate) filter.settlementDate.$lte = new Date(endDate);
    }

    const settlements = await DriverSettlement.find(filter).sort({ settlementDate: -1 });
    res.json(settlements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
