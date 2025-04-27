const express = require('express');
const router = express.Router();
const notificationController = require('../../controller/CustomNotification/custom-notification');

// Create a notification
router.post('/notifications', notificationController.createNotification);

// Delete a notification
router.delete('/notifications/:id', notificationController.deleteNotification);

// Get notifications (for user, deliveryBoy, or hotel)
router.get('/notifications', notificationController.getNotifications);

module.exports = router;
