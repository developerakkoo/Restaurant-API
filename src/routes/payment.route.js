const router = require("express").Router();
const {
    initiatePhonePePayment,
    validatePayment,
} = require("../controller/payment.controller");

router.post("/initiate", initiatePhonePePayment);

router.get("/validate/:merchantTransactionId", validatePayment);

module.exports = { paymentRoutes: router };
