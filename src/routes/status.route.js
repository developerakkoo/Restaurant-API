const express = require("express");
const router = express.Router();
const statusController = require("../controller/status.controller");
// Get online status of a specific user
router.get("/:userId/:userType", statusController.getOnlineStatus);

// Get list of online users by type
router.get("/online/:userType", statusController.getOnlineUsers);

// Update user's online status
router.put("/update", statusController.updateOnlineStatus);


module.exports = router; 