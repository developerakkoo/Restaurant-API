const express = require('express');
const router = express.Router();
const driverEarningController = require('../controller/Delivery-Boy/delivery-boy-earnings');

router.post('/create', driverEarningController.createEarning);
router.get('/list', driverEarningController.getDriverEarnings);

module.exports = router;
