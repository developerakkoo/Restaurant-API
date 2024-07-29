const router = require("express").Router();
const {
    initiatePhonePePayment,
    initiateRazorPayPayment,
    validatePayment,
} = require("../controller/payment.controller");

// router.post("/initiate", initiatePhonePePayment);

router.post("/initiate", initiateRazorPayPayment);

router.get("/validate/:merchantTransactionId", validatePayment);

module.exports = { paymentRoutes: router };
