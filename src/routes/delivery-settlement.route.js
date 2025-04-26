const express = require('express');
const router = express.Router();
const driverSettlementController = require('../controller/Delivery-Boy/delivery-boy-settlement');

router.post('/settle', driverSettlementController.settleDriver);
router.get('/list', driverSettlementController.getSettlements);

module.exports = router;
