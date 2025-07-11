const express = require("express");
const invoiceController = require("../controller/invoice.controller");

const { asyncHandler } = require("../utils/asyncHandler");
const router = express.Router();

// Invoice routes
router.post(
  "/generate",
  asyncHandler(invoiceController.generatePartnerInvoice)
);

module.exports = router;
