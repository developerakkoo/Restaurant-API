const express = require('express');
const router = express.Router();
const adminAnalyticsController = require('../../controller/Analytics/analytics');

router.get('/driver', adminAnalyticsController.getDriverAnalytics);

module.exports = router;
