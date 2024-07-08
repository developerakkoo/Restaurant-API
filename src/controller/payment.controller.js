const axios = require("axios");
const sha256 = require("sha256");
const uniqid = require("uniqid");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { BASE_URL } = require("../constant");
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

    const { amount = 100, userId = "666befce1ae4735d66a896ec" } = req.body;
    let merchantTransactionId = uniqid();

    let normalPayLoad = {
        merchantId: MERCHANT_ID, //* PHONEPE_MERCHANT_ID . Unique for each account (private)
        merchantTransactionId: merchantTransactionId,
        merchantUserId: userId, //userId
        amount: amount * 100, // converting to paise
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
            res.redirect(
                response.data.data.instrumentResponse.redirectInfo.url,
            );
        })
        .catch(function (error) {
            res.send(error.message);
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
                console.log("response->", response.data);
                if (response.data && response.data.code === "PAYMENT_SUCCESS") {
                    // redirect to FE payment success status page
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
