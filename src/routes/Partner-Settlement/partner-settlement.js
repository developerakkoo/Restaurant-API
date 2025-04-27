const express = require('express');
const router = express.Router();
const partnerSettlementController = require('../../controller/Partner-Settlement/partner-settlement');

// Admin APIs
router.get('/partner-settlements', partnerSettlementController.getSettlements);
router.put('/partner-settlements/settle', partnerSettlementController.markAsSettled);
router.get('/partner-settlements/analytics', partnerSettlementController.getEarningsAnalytics);

module.exports = router;
