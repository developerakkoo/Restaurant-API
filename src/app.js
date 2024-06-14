require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const { BASE_URL, API_VERSION } = require("./constant");
const morganMiddleware = require("./logger/morgan.logger");
const { errorHandler } = require("./middleware/error.middlewares");
const cookieParser = require("cookie-parser");
const { apiRateLimiter } = require("./utils/apiRateLimiter");
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

// Set the views directory
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Serve uploaded files as static content
app.use("/upload", express.static(path.join(__dirname, "upload")));
/*Api rate limiter */
app.use(apiRateLimiter);

/* Importing Routers */
const {
    verify_access_token,
    verify_refresh_token,
} = require("./middleware/verifyJwtToken.middleware");

const { authRoutes } = require("./routes/auth.route");
const { userRoutes } = require("./routes/user.route");
const { cartRoutes } = require("./routes/cart.route");
const { adminRoutes } = require("./routes/admin.route");
const { orderRoutes } = require("./routes/order.route");
const { hotelStarRoutes } = require("./routes/hotel.route");
const { partnerRoutes } = require("./routes/partner.route");
const { favoriteRoutes } = require("./routes/favorite.route");
const { deliverBoyRoutes } = require("./routes/deliveryBoy.route");
const { notificationRoutes } = require("./routes/notification.route");
const { ApiResponse } = require("./utils/ApiResponseHandler");

/*Api Logger */
app.use(morganMiddleware);

app.use(`${BASE_URL}/health-check`, (req, res) => {
    res.status(200).json(
        new ApiResponse(
            200,
            `API VERSION: V ${API_VERSION}`,
            "Everything is working as expected",
        ),
    );
});
app.use(`${BASE_URL}/auth`, authRoutes);
app.use(verify_access_token);
app.use(`${BASE_URL}/user`, userRoutes);
app.use(`${BASE_URL}/admin`, adminRoutes);
app.use(`${BASE_URL}/order`, orderRoutes);
app.use(`${BASE_URL}/user/cart`, cartRoutes);
app.use(`${BASE_URL}/hotel`, hotelStarRoutes);
app.use(`${BASE_URL}/partner`, partnerRoutes);
app.use(`${BASE_URL}/user/favorite`, favoriteRoutes);
app.use(`${BASE_URL}/deliver-boy`, deliverBoyRoutes);
app.use(`${BASE_URL}/notification`, notificationRoutes);


app.use(errorHandler);

module.exports = { app };
