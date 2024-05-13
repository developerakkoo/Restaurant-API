const router = require("express").Router();
const notificationController = require("../controller/notification.controller");

router.post("/send", notificationController.sendNotification);

router.get("/get/:notificationId", notificationController.getNotificationById);

router.get("/get/all/:userId", notificationController.getAllNotificationByUserId);

router.put("/markAsRead/:notificationId", notificationController.markAsRead);

router.delete("/delete/:notificationId", notificationController.deleteNotificationById);

module.exports = { notificationRoutes: router };
