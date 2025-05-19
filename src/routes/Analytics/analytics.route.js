const express = require('express');
const router = express.Router();
const adminAnalyticsController = require('../../controller/analytics.controller');

// router.get('/driver', adminAnalyticsController.getDriverAnalytics);

router.get('/admin-earnings', adminAnalyticsController.getAdminEarnings);
router.get('/admin-earnings-breakdown', adminAnalyticsController.getEarningsBreakdown);

// router.get('/partner-earnings', adminAnalyticsController.getPartnerEarnings);

// router.get('/partner-settlements', adminAnalyticsController.getPartnerSettlements);

// router.get('/partner-settlements', adminAnalyticsController.getPartnerSettlements);


module.exports = router;
