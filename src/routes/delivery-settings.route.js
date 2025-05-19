const express = require('express');
const router = express.Router();
const driverSettingsController = require('../controller/Delivery-Boy/delivery-boy-settings');

router.post('/create', driverSettingsController.createDriverSettings);
router.put('/update', driverSettingsController.updateDriverSettings);
router.get('/get', driverSettingsController.getDriverSettings);

module.exports = router;
