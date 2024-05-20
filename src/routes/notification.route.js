const router = require("express").Router();
const notificationController = require("../controller/notification.controller");
const { upload } = require("../middleware/fileHandler.middleware");

router.post("/send", notificationController.sendNotification);

router.post(
    "/multimedia-send",
    upload.single("image"),
    notificationController.sendMultimediaNotification,
);

router.get("/get/:notificationId", notificationController.getNotificationById);

router.get(
    "/get/all/:userId",
    notificationController.getAllNotificationByUserId,
);

router.put("/markAsRead/:notificationId", notificationController.markAsRead);

router.delete(
    "/delete/:notificationId",
    notificationController.deleteNotificationById,
);

module.exports = { notificationRoutes: router };
