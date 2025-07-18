require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const app = express();

const { BASE_URL, API_VERSION } = require("./constant");
const morganMiddleware = require("./logger/morgan.logger");
const { errorHandler } = require("./middleware/error.middlewares");
const cookieParser = require("cookie-parser");
const { apiRateLimiter } = require("./utils/apiRateLimiter");
const session = require("express-session");
const { setupPassports } = require("./passport");
const passport = require("passport");
const path = require("path");

app.use(express.urlencoded({ limit:'50mb', extended: true }));
app.use(express.json({limit:'50mb'}));
app.use(cors());
app.use(cookieParser());

require("./cron job/firebaseNotification.cron");

setupPassports(passport);

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: true,
    }),
); // session secret
app.use(passport.initialize());
app.use(passport.session());

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
    //res.setHeader("Cross-Origin-Resource-Policy", 'cross-origin');
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
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'", "*"],
                imgSrc: ["'self'", "data:", "https:", "https://api.dropeat.in"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*"],
                styleSrc: ["'self'", "'unsafe-inline'", "*"],
            },
        },
    }),
);

// Set the views directory
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Serve uploaded files as static content
app.use("/upload", express.static(path.join(__dirname, "upload"), {
    setHeaders: function(res,path,stat){
        res.set("Access-Control-Allow-Origin","*")
        res.set("Cross-Origin-Resource-Policy","cross-origin")
    },
}));

app.use('/invoices', express.static(path.join(__dirname, './invoices'), {
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
    }
  }));
  

/*Api rate limiter */
// app.use(apiRateLimiter);

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
const { messageRoutes } = require("./routes/message.route");
const { notificationRoutes } = require("./routes/notification.route");
const { ApiResponse } = require("./utils/ApiResponseHandler");
const { paymentRoutes } = require("./routes/payment.route");
const { setupPassport } = require("./passport");
const { ratingRoutes } = require("./routes/rating.route");
const statusRoutes = require("./routes/status.route");
const chatRoute = require("./routes/message.route");
const { hotelOfferRoutes } = require("./routes/hotelOffer.route");
const deliverySettingsRoutes = require("./routes/delivery-settings.route");
const deliveryEarningsRoutes = require("./routes/delivery-earnings.route");
const deliverySettlementRoutes = require("./routes/delivery-settlement.route");
const analyticsRoutes = require("./routes/Analytics/analytics.route");
const customNotificationRoutes = require("./routes/Custom-Notifications/custom-notification");
const partnerSettlementRoutes = require("./routes/Partner-Settlement/partner-settlement");

const invoiceRoutes = require("./routes/invoice.route");
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
app.use(`${BASE_URL}/admin`, adminRoutes);
// app.use(verify_access_token);
app.use(`${BASE_URL}/payment`, paymentRoutes);
app.use(`${BASE_URL}/user`, userRoutes);
app.use(`${BASE_URL}/order`, orderRoutes);
app.use(`${BASE_URL}/user/cart`, cartRoutes);
app.use(`${BASE_URL}/hotel`, hotelStarRoutes);
app.use(`${BASE_URL}/partner`, partnerRoutes);
app.use(`${BASE_URL}/user/favorite`, favoriteRoutes);
app.use(`${BASE_URL}/chat`, chatRoute);
app.use(`${BASE_URL}/deliver-boy`, deliverBoyRoutes);
app.use(`${BASE_URL}/notification`, notificationRoutes);
app.use(`${BASE_URL}/ratings`, ratingRoutes);
app.use(`${BASE_URL}/status`, statusRoutes);
app.use(`${BASE_URL}/offer`, hotelOfferRoutes);
app.use(`${BASE_URL}/delivery-settings`, deliverySettingsRoutes);
app.use(`${BASE_URL}/delivery-earnings`, deliveryEarningsRoutes);
app.use(`${BASE_URL}/delivery-settlement`, deliverySettlementRoutes);
app.use(`${BASE_URL}/analytics`, analyticsRoutes);  
app.use(`${BASE_URL}/custom-notifications`, customNotificationRoutes);
app.use(`${BASE_URL}/partner-settlement`, partnerSettlementRoutes);
app.use(`${BASE_URL}/invoice`, invoiceRoutes);
// Setup chat routes
app.use(`${BASE_URL}/chat`,chatRoute );
app.use(errorHandler);

module.exports = { app };
