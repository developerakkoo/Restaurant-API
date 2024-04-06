require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const { BASE_URL } = require("./constant");
const morganMiddleware = require("./logger/morgan.logger");
const { errorHandler } = require("./middleware/error.middlewares");
const cookieParser = require("cookie-parser");
const path = require("path");

app.use(cors());
app.use(cookieParser());

/**
 * Sets the response headers to allow cross-origin requests (CORS)
 * @param {import('express').Request} req - The request object
 * @param {import('express').Response} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "OPTIONS, GET, POST, PUT, PATCH, DELETE",
    );
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Credentials", true);
    next();
});

/**
 * Sets the response headers to allow cross-origin requests (CORS)
 * @param {import('express').Request} req - The request object
 * @param {import('express').Response} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
app.use(
    helmet({
        frameguard: {
            action: "deny",
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
        referrerPolicy: {
            policy: "same-origin",
        },
    }),
);

/*Api rate limiter */
// app.use(apiRateLimiter);

/* Importing Routers */
const {
    verify_access_token,
    verify_refresh_token,
} = require("./middleware/verifyJwtToken.middleware");
const { adminRoutes } = require("./routes/admin.route");
const { authRoutes } = require("./routes/auth.route");
const { userRoutes } = require("./routes/user.route");
const { partnerRoutes } = require("./routes/partner.route");
const { deliverBoyRoutes } = require("./routes/deliveryBoy.route");

/*Api Logger */
app.use(morganMiddleware);

app.use(`${BASE_URL}/auth`, authRoutes);
app.use(verify_access_token);
app.use(`${BASE_URL}/user`, userRoutes);
app.use(`${BASE_URL}/admin`, adminRoutes);
app.use(`${BASE_URL}/partner`,partnerRoutes);
app.use(`${BASE_URL}/deliver-boy`, deliverBoyRoutes);
// Serve uploaded files as static content
app.use("/upload", express.static(path.join(__dirname, "upload")));
app.use(errorHandler);
module.exports = { app };
