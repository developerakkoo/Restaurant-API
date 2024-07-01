const router = require("express").Router();
const messageController = require("../controller/message.controller");
const { upload } = require("../middleware/fileHandler.middleware");

router.get("/get/chat-list/:userId",messageController.getMyChatList)

router.post(
    "/send",
    messageController.checkChatExist,
    messageController.sendMessage,
);

router.post(
    "/multimedia-send",
    upload.single("image"),
    messageController.checkChatExist,
    messageController.sendMultimediaMessage,
);

router.get("/get/:messageId", messageController.getMessageById);

router.get(
    "/get/all/:userId",
    messageController.getAllMessageByUserId,
);

router.put("/markAsRead/:messageId", messageController.markAsRead);

router.delete(
    "/delete/:messageId",
    messageController.deleteMessageById,
);

module.exports = { messageRoutes: router };
