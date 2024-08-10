const axios = require("axios");
const sha256 = require("sha256");
const uniqid = require("uniqid");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { getIO } = require("../utils/socket");
const { BASE_URL } = require("../constant");
const razorpay = require("razorpay");
const key = process.env.RAZORPAY_ID;
const secret = process.env.RAZORPAY_SECRET;

var instance = new razorpay({
    key_id: key,
    key_secret: secret,
});

// UAT environment
const MERCHANT_ID = process.env.MERCHANT_ID;
const PHONE_PE_HOST_URL = process.env.PHONE_PE_HOST_URL;
const SALT_INDEX = process.env.SALT_INDEX;
const SALT_KEY = process.env.SALT_KEY;

const PHONE_PE_CHECKOUT_URL = process.env.PHONE_PE_CHECKOUT_URL;

exports.initiatePhonePePayment = asyncHandler(async (req, res) => {
    let APP_BE_URL = "http://localhost:8000"; // our application

    if (process.env.NODE_ENV === "production") {
        APP_BE_URL = "https://api.dropeat.in";
    }

    const { amount, userId } = req.body;
    let merchantTransactionId = uniqid();

    let normalPayLoad = {
        merchantId: MERCHANT_ID, //* PHONEPE_MERCHANT_ID . Unique for each account (private)
        merchantTransactionId: merchantTransactionId,
        merchantUserId: userId, //userId
        amount: Math.ceil(amount) * 100, // converting to paise
        redirectUrl: `${APP_BE_URL}${BASE_URL}/payment/validate/${merchantTransactionId}`,
        redirectMode: "REDIRECT",
        callbackUrl: `${APP_BE_URL}${BASE_URL}/payment/validate/${merchantTransactionId}`,
        paymentInstrument: {
            type: "PAY_PAGE",
        },
    };

    // Convert payload to base64
    let bufferObj = Buffer.from(JSON.stringify(normalPayLoad), "utf8");
    let base64EncodedPayload = bufferObj.toString("base64");

    // Generate xVerifyChecksum
    let xVerifyChecksum =
        sha256(base64EncodedPayload + "/pg/v1/pay" + SALT_KEY) +
        "###" +
        SALT_INDEX;

    const options = {
        method: "post",
        url: PHONE_PE_CHECKOUT_URL,
        headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            "X-VERIFY": xVerifyChecksum,
        },
        data: {
            request: base64EncodedPayload,
        },
    };
    axios
        .request(options)
        .then(function (response) {
            console.log("response->", response.data);
            res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        url: response.data.data.instrumentResponse.redirectInfo
                            .url,
                        merchantTransactionId,
                    },
                    "PhonePe payment initiated successfully",
                ),
            );
        })
        .catch(function (error) {
            res.status(400).json(new ApiResponse(400, {}, error.message));
        });
});

exports.validatePayment = asyncHandler(async (req, res) => {
    const { merchantTransactionId } = req.params;
    // check the status of the payment using merchantTransactionId
    if (merchantTransactionId) {
        let statusUrl =
            `${PHONE_PE_HOST_URL}/pg/v1/status/${MERCHANT_ID}/` +
            merchantTransactionId;

        // generate X-VERIFY
        let string =
            `/pg/v1/status/${MERCHANT_ID}/` + merchantTransactionId + SALT_KEY;
        let sha256_val = sha256(string);
        let xVerifyChecksum = sha256_val + "###" + SALT_INDEX;

        axios
            .get(statusUrl, {
                headers: {
                    "Content-Type": "application/json",
                    "X-VERIFY": xVerifyChecksum,
                    "X-MERCHANT-ID": merchantTransactionId,
                    accept: "application/json",
                },
            })
            .then(function (response) {
                // console.log("response->", response.data);
                if (response.data && response.data.code === "PAYMENT_SUCCESS") {
                    // redirect to FE payment success status page
                    getIO().emit(merchantTransactionId, response.data);
                    return res
                        .status(200)
                        .json(new ApiResponse(200, response.data, "success"));
                } else {
                    // redirect to FE payment failure / pending status page
                    return res
                        .status(400)
                        .json(new ApiResponse(400, {}, "Failed to process"));
                }
            })
            .catch(function (error) {
                // redirect to FE payment failure / pending status page
                return res
                    .status(400)
                    .json(new ApiResponse(400, null, error.message));
            });
    } else {
        return res
            .status(500)
            .json(new ApiResponse(500, null, "Sorry!! Error"));
    }
});

// Initiate payment request
exports.initiateRazorPayPayment = asyncHandler(async (req, res) => {
    const { amount } = req.body;

    const options = {
        amount: amount * 100, // Razorpay expects the amount in paise
        currency: "INR",
    };

    const order = await instance.orders.create(options);
    res.status(200).json(new ApiResponse(200, order, "Order Created."));
});
