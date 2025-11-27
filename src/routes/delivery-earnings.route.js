const express = require('express');
const router = express.Router();
const driverEarningController = require('../controller/Delivery-Boy/delivery-boy-earnings');

router.post('/create', driverEarningController.createEarning);
router.get('/list', driverEarningController.getDriverEarnings);
router.get('/summary/:driverId', driverEarningController.getEarningsSummary);
router.get('/settlement/:driverId', driverEarningController.getSettlementSummary);
router.get('/statistics/:driverId', driverEarningController.getEarningsStatistics);
router.get('/recent/:driverId', driverEarningController.getRecentEarnings);

module.exports = router;
