const DriverSettings = require('../../models/Delivery-Boy/driverSettings');

// Create initial settings (only once)
exports.createDriverSettings = async (req, res) => {
  try {
    const { perDeliveryAmount, bonus16thDelivery, bonus21stDelivery } = req.body;

    // Check if already exists
    const existing = await DriverSettings.findOne();
    if (existing) {
      return res.status(400).json({ message: 'Driver settings already exist. Please update instead.' });
    }

    const settings = new DriverSettings({
      perDeliveryAmount,
      bonus16thDelivery,
      bonus21stDelivery
    });

    await settings.save();
    res.status(201).json({ message: 'Driver settings created successfully', settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update settings
exports.updateDriverSettings = async (req, res) => {
  try {
    const { perDeliveryAmount, bonus16thDelivery, bonus21stDelivery } = req.body;

    const settings = await DriverSettings.findOne();
    if (!settings) {
      return res.status(404).json({ message: 'Driver settings not found. Please create first.' });
    }

    if (perDeliveryAmount !== undefined) settings.perDeliveryAmount = perDeliveryAmount;
    if (bonus16thDelivery !== undefined) settings.bonus16thDelivery = bonus16thDelivery;
    if (bonus21stDelivery !== undefined) settings.bonus21stDelivery = bonus21stDelivery;

    await settings.save();
    res.status(200).json({ message: 'Driver settings updated successfully', settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get settings (used by app logic)
exports.getDriverSettings = async (req, res) => {
  try {
    const settings = await DriverSettings.findOne();
    if (!settings) {
      return res.status(404).json({ message: 'Driver settings not found' });
    }

    res.status(200).json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
