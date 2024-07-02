const Partner = require("../models/partner.model");
const Hotel = require("../models/hotel.model");
const { responseMessage, cookieOptions } = require("../constant");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { generateTokens } = require("../utils/generateToken");
const { deleteFile } = require("../utils/deleteFile");
const { Types } = require("mongoose");
const orderModel = require("../models/order.model");
const hotelDishModel = require("../models/hotelDish.model");
const moment = require("moment");
const hotelModel = require("../models/hotel.model");

/**
 *  @function registerPartner
 * @async
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @throws {ApiError} Throws an ApiError if validation or registration fails
 *  @description This asynchronous function handles the registration of an  user.
 * It extracts email and password from the request body, validates the fields, checks for existing user,
 * creates a new user, and returns the registered user details in the response.
 */
exports.registerPartner = asyncHandler(async (req, res) => {
    const { name, email, phoneNumber, password } = req.body;
    const existedUser = await Partner.findOne({
        $or: [{ email }, { phoneNumber }],
    });
    if (existedUser) {
        throw new ApiError(409, responseMessage.userMessage.userExist);
    }
    const user = await Partner.create({
        name,
        email,
        phoneNumber,
        password,
    });
    const createdUser = await Partner.findById(user._id).select(
        "-password -refreshToken",
    );
    if (!createdUser) {
        throw new ApiError(500, responseMessage.userMessage.userNotCreated);
    }
    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                createdUser,
                responseMessage.userMessage.userCreated,
            ),
        );
});

/**
 *  @function loginPartner
 * @async
 * @param {import("express").Request} req - Express request object
 *  @param {import("express").Response} res - Express response object
 * @throws {ApiError} Throws an ApiError if validation or login fails
 *  @description  * @description This asynchronous function handles user login. It validates the provided email and password,
 * generates access and refresh tokens upon successful login, sets cookies with the tokens, and sends a response
 * indicating the login status along with the user details (excluding password and refreshToken).
 */
exports.loginPartner = asyncHandler(async (req, res) => {
    // Extract user login details from the request body
    const { phoneNumber } = req.body;

    // Find a user with the provided email in the database
    const user = await Partner.findOne({ phoneNumber });

    // If the user is not found, return a 404 response
    if (!user) {
        throw new ApiError(404, responseMessage.userMessage.userNotFound);
    }

    // Check if the provided password is correct
    // const isPasswordValid = await user.isPasswordCorrect(password);

    // If the password is incorrect, return a 401 response
    // if (!isPasswordValid) {
    //     throw new ApiError(401, responseMessage.userMessage.incorrectPassword);
    // }

    // Generate access and refresh tokens for the logged-in user
    const { accessToken, refreshToken } = await generateTokens(user._id, 4);

    // Retrieve the logged-in user details excluding password and refreshToken
    const loggedInUser = await Partner.findById(user._id).select(
        "-password -refreshToken",
    );
    const hotels = await hotelModel.countDocuments({
        userId: loggedInUser._id,
    });

    // Send a successful login response with cookies containing access and refresh tokens
    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    userId: loggedInUser._id,
                    hotelCount: hotels,
                    accessToken,
                    refreshToken,
                },
                responseMessage.userMessage.loginSuccessful,
            ),
        );
});

exports.addHotel = asyncHandler(async (req, res) => {
    const { userId, hotelName, address, category } = req.body;
    const hotel = await Hotel.create({
        userId,
        hotelName,
        address,
        category,
    });
    if (!hotel) {
        throw new ApiError(500, responseMessage.userMessage.hotelNotCreated);
    }
    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                hotel,
                responseMessage.userMessage.hotelCreated,
            ),
        );
});

exports.updateHotel = asyncHandler(async (req, res) => {
    const { hotelId, hotelName, address, hotelStatus, category, isOnline } =
        req.body;
    const hotelImage = await Hotel.findByIdAndUpdate(
        hotelId,
        {
            $set: {
                hotelName: hotelName,
                address: address,
                hotelStatus: hotelStatus,
                category: category,
                isOnline: isOnline,
            },
        },
        {
            new: true,
        },
    );
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                hotelImage,
                responseMessage.userMessage.hotelUpdated,
            ),
        );
});

exports.deleteHotel = asyncHandler(async (req, res) => {
    const { hotelId } = req.query;
    const deletedHotel = await Hotel.findByIdAndDelete(hotelId);
    if (!deletedHotel.local_imagePath) {
        throw new ApiError(404, responseMessage.userMessage.hotelNotFound);
    }
    deleteFile(deletedHotel.local_imagePath);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "ok",
                responseMessage.userMessage.hotelDeletedSuccessfully,
            ),
        );
});

exports.uploadHotelImage = asyncHandler(async (req, res) => {
    const { hotelId } = req.body;
    // console.log(req.file);
    const { filename } = req.file;
    const local_filePath = `upload/${filename}`;
    let document_url = `https://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        document_url = `https://${req.hostname}:8000/upload/${filename}`;
    }
    const savedHotel = await Hotel.findById(hotelId);
    if (savedHotel) {
        deleteFile(savedHotel.local_imagePath);
    }
    const hotelDocument = await Hotel.findByIdAndUpdate(
        hotelId,
        {
            $set: {
                image_url: document_url,
                local_imagePath: local_filePath,
            },
        },
        {
            new: true,
        },
    );
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                hotelDocument,
                responseMessage.userMessage.hotelImageUploadedSuccessfully,
            ),
        );
});

exports.getPartnerById = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
    const { populate } = req.query;

    // Check if partnerId is a valid ObjectId
    // if (!Types.ObjectId.isValid(partnerId)) {
    //     throw new ApiError(400, "Invalid partner ID");
    // }

    let partnerAggregation = [
        {
            $match: {
                _id: new Types.ObjectId(partnerId),
            },
        },
        {
            $project: { password: 0, refreshToken: 0 }, // Exclude sensitive fields from the result
        },
    ];

    if (populate && populate === "1") {
        // Ensure populate is compared as string '1'
        partnerAggregation.splice(1, 0, {
            // Insert $lookup stage after $match
            $lookup: {
                as: "hotels",
                from: "hotels",
                foreignField: "userId",
                localField: "_id",
            },
        });
    }

    const partner = await Partner.aggregate(partnerAggregation).exec();

    if (!partner || partner.length === 0) {
        throw new ApiError(404, "Partner not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                partner,
                responseMessage.userMessage.userFetchedSuccessfully,
            ),
        );
});

exports.getPartnerDashboard = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;

    try {
        // Fetch all hotels for the given partner
        const hotels = await Hotel.find({ userId: partnerId });

        // Extract the hotel IDs
        const hotelIds = hotels.map((hotel) => hotel._id);

        // Define the date for today and the start of the month
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const startOfMonth = new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1,
        );

        // Define the queries
        let todaysOrderDbQuery = {
            hotelId: { $in: hotelIds },
            createdAt: { $gte: startOfToday, $lte: endOfToday },
        };
        let monthlyOrderDbQuery = {
            hotelId: { $in: hotelIds },
            createdAt: { $gte: startOfMonth },
        };
        let dishInStockDbQuery = { hotelId: { $in: hotelIds }, stock: 1 };
        let dishOutOfStockDbQuery = { hotelId: { $in: hotelIds }, stock: 0 };

        // Fetch the data using the defined queries
        const [todaysOrders, monthlyOrder, dishInStock, dishOutOfStock] =
            await Promise.all([
                orderModel.countDocuments(todaysOrderDbQuery), // Today's orders
                orderModel.countDocuments(monthlyOrderDbQuery), // Monthly orders
                hotelDishModel.countDocuments(dishInStockDbQuery), // In stock products
                hotelDishModel.countDocuments(dishOutOfStockDbQuery), // Out of stock products
            ]);

        // Respond with the fetched data
        res.status(200).json(
            new ApiResponse(
                200,
                {
                    todaysOrders,
                    monthlyOrder,
                    dishInStock,
                    dishOutOfStock,
                },
                "Partner Dashboard Data Fetched Successfully",
            ),
        );
    } catch (error) {
        // Handle any errors
        res.status(500).json(
            new ApiResponse(
                500,
                null,
                "Failed to fetch partner dashboard data",
            ),
        );
    }
});

exports.toggleCategoryOutOfStock = asyncHandler(async (req, res) => {
    const { hotelId, categoryId } = req.params;
    const { isOutOfStock } = req.body;

    // Update all matching dishes
    await hotelDishModel.updateMany(
        { hotelId, categoryId },
        {
            $set: {
                stock: isOutOfStock,
            },
        },
    );

    // Retrieve the updated dishes
    const updatedDishes = await hotelDishModel.find({ hotelId, categoryId });

    // Respond with the updated documents
    res.status(200).json(
        new ApiResponse(
            200,
            updatedDishes,
            isOutOfStock
                ? "Dish Category In Stock"
                : "Dish Category Out of Stock",
        ),
    );
});

exports.getEarnings = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
    const { startDate } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    // Fetch Hotel based on partnerId
    const hotels = await hotelModel.find({ userId: partnerId });

    if (hotels.length === 0) {
        return res
            .status(404)
            .json(
                new ApiResponse(
                    404,
                    null,
                    "No hotels found for the given partner",
                ),
            );
    }

    // Extract the hotel IDs
    const hotelIds = hotels.map((hotel) => hotel._id);

    // Define date filters based on user input or default to current month
    let filter = { hotelId: { $in: hotelIds } };
    if (startDate && endDate) {
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        sDate.setHours(0, 0, 0, 0);
        eDate.setHours(23, 59, 59, 999);
        filter.createdAt = {
            $gte: sDate,
            $lte: eDate,
        };
    } else {
        // Default to current month
        const startOfMonth = moment().startOf("month").toDate();
        const endOfMonth = moment().endOf("month").toDate();
        filter.createdAt = {
            $gte: startOfMonth,
            $lte: endOfMonth,
        };
    }

    // Fetch orders within the date range and for the specified hotel
    const orders = await orderModel.find(filter).populate({
        path: "products.dishId",
        model: "HotelDish",
    });

    // Calculate total earnings for the hotel
    let totalEarnings = 0;
    const dailyEarnings = {}; // Object to store daily earnings
    orders.forEach((order) => {
        order.products.forEach((product) => {
            const dish = product.dishId;

            // Find the hotelId associated with this dish
            const dishHotelId = String(dish.hotelId);
            // Check if this dish belongs to any of the hotels fetched
            // if (hotelIds.includes(dishHotelId)) {
            const earning = dish.partnerPrice * product.quantity;
            totalEarnings += earning;

            // Aggregate daily earnings
            const dateKey = new Date(order.createdAt)
                .toISOString()
                .split("T")[0]; // YYYY-MM-DD format
            if (!dailyEarnings[dateKey]) {
                dailyEarnings[dateKey] = 0;
            }
            dailyEarnings[dateKey] += earning;
            // }
        });
    });

    // Prepare response
    const response = {
        totalEarnings,
        dailyEarnings: Object.entries(dailyEarnings).map(
            ([date, earnings]) => ({ date, earnings }),
        ),
    };
    res.status(200).json(
        new ApiResponse(200, response, "Earnings Data Fetched Successfully"),
    );
});

exports.getHotelsByIdPartnerId = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
    const hotels = await hotelModel.find({ userId: partnerId });
    res.status(200).json(
        new ApiResponse(200, hotels, "Hotels Fetched Successfully"),
    );
});


exports.updatePartner = asyncHandler