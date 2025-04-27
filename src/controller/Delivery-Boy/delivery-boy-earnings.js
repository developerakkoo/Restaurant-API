const DriverEarning = require('../../models/Delivery-Boy/driverEarnings');
const DriverSettings = require('../../models/Delivery-Boy/driverSettings');
const Order = require('../../models/order.model');
const PartnerSettlement = require('../../models/Partner-Settlements/partner-settlement');
const { createSettlement } = require('../Partner-Settlement/partner-settlement');

exports.createEarning = async (req, res) => {
  try {
    const { driverId, orderId } = req.body;
    const settings = await DriverSettings.findOne();
    if (!settings) {
      return res.status(400).json({ message: 'Driver settings not configured' });
    }

    const totalDeliveries = await DriverEarning.countDocuments({ driverId });
    const order = await Order.findById(orderId);
      const settlement = await PartnerSettlement.findOne({ orderId });
      if(settlement){
        return res.status(400).json({ message: 'Settlement already exists' });
      }
      else{
        await createSettlement(order); 
      }
    
      let bonus = 0;
    if (totalDeliveries + 1 === 16) {
      bonus = settings.bonus16thDelivery;
    } else if (totalDeliveries + 1 === 21) {
      bonus = settings.bonus21stDelivery;
    }

    const amount = settings.perDeliveryAmount + bonus;

    const earning = new DriverEarning({
      driverId,
      orderId,
      date: new Date(),
      amount,
      bonus,
    });

    await earning.save();
    res.status(201).json({ message: 'Earning recorded', earning });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getDriverEarnings = async (req, res) => {
  try {
    const { driverId, startDate, endDate, sortBy = 'date' } = req.query;
    const filter = {};

    if (driverId) filter.driverId = driverId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const earnings = await DriverEarning.find(filter)
      .sort({ [sortBy]: -1 });

    res.json(earnings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
