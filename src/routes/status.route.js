const express = require("express");
const router = express.Router();
const statusController = require("../controller/status.controller");
const { verify_access_token } = require("../middleware/verifyJwtToken.middleware");
const { authorizeStatusUpdate } = require("../middleware/statusUpdate.middleware");

router.get("/:userId/:userType", statusController.getOnlineStatus);
router.get("/online/:userType", statusController.getOnlineUsers);
router.put(
    "/update",
    verify_access_token,
    authorizeStatusUpdate,
    statusController.updateOnlineStatus
);

module.exports = router;
