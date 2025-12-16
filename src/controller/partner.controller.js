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
const PartnerSettlement = require("../models/Partner-Settlements/partner-settlement");

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
    console.log(user);
    
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
    console.log(hotels);
    
    const hotelId = await hotelModel.findOne({ userId: loggedInUser._id });
    console.log(hotelId);
    
    if(hotelId == null && hotels == 0){
        return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    userId: {
                        _id: loggedInUser._id,
                        name: loggedInUser.name,
                        email: loggedInUser.email,
                        phoneNumber: loggedInUser.phoneNumber,
                        profile_image: loggedInUser.profile_image,
                        status: loggedInUser.status,
                        createdAt: loggedInUser.createdAt,
                        updatedAt: loggedInUser.updatedAt
                    },
                    hotelId: null,
                    hotelCount: 0,
                    accessToken,
                    refreshToken,
                },
                responseMessage.userMessage.loginSuccessful,
            ),
        );
    }else if(hotelId != null && hotels > 0){
        // Populate hotel with detailed information
        const populatedHotel = await hotelModel.findById(hotelId._id)
            .populate({
                path: 'userId',
                select: 'name email phoneNumber profile_image status'
            })
            .populate({
                path: 'category',
                select: 'name image_url'
            })
            .select('-createdAt -updatedAt -__v');
            
        // Send a successful login response with cookies containing access and refresh tokens
        return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    userId: {
                        _id: loggedInUser._id,
                        name: loggedInUser.name,
                        email: loggedInUser.email,
                        phoneNumber: loggedInUser.phoneNumber,
                        profile_image: loggedInUser.profile_image,
                        status: loggedInUser.status,
                        createdAt: loggedInUser.createdAt,
                        updatedAt: loggedInUser.updatedAt
                    },
                    hotelId: {
                        _id: populatedHotel._id,
                        hotelName: populatedHotel.hotelName,
                        image_url: populatedHotel.image_url,
                        local_imagePath: populatedHotel.local_imagePath,
                        address: populatedHotel.address,
                        location: populatedHotel.location,
                        isTop: populatedHotel.isTop,
                        hotelStatus: populatedHotel.hotelStatus,
                        isOnline: populatedHotel.isOnline,
                        userId: populatedHotel.userId, // This will be populated with partner details
                        category: populatedHotel.category // This will be populated with category details
                    },
                    hotelCount: hotels,
                    accessToken,
                    refreshToken,
                },
                responseMessage.userMessage.loginSuccessful,
            ),
        );
    }
   
});

exports.addHotel = asyncHandler(async (req, res) => {
    const { userId, hotelName, address, category, lng, lat } = req.body;
    const hotel = await Hotel.create({
        userId,
        hotelName,
        address,
        category,
        location: {
            type: "Point",
            coordinates: [lng, lat],
        },
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

exports.deletePartnerAndHotel = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
    // Delete the partner by ID
    const deletedPartner = await Partner.findByIdAndDelete(partnerId);
    // Find and delete all hotels associated with the partner
    const hotels = await Hotel.find({ userId: partnerId });

    if (hotels.length > 0) {
        const hotelIds = hotels.map((hotel) => hotel._id);

        // Delete all hotels associated with the partner
        await Hotel.deleteMany({ userId: partnerId });

        // Delete all dishes associated with the deleted hotels
        await hotelDishModel.deleteMany({
            hotelId: { $in: hotelIds },
        });
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, "ok", "Partner & Hotel Deleted Successfully!"),
        );
});
exports.uploadHotelImage = asyncHandler(async (req, res) => {
    const { hotelId } = req.body;
    // console.log(req.file);
    const { filename } = req.file;
    const local_filePath = `upload/${filename}`;
    let document_url = `https://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        document_url = `https://${req.hostname}/upload/${filename}`;
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
        console.log("Partner ID:", partnerId);
        
        // Convert partnerId to ObjectId if it's a string
        const partnerObjectId = new Types.ObjectId(partnerId);
        
        // Fetch all hotels for the given partner
        const hotels = await hotelModel.find({ userId: partnerObjectId });
        console.log("Hotels found:", hotels.length);
        console.log("Hotels:", hotels.map(h => ({ id: h._id, name: h.hotelName })));

        // Extract the hotel IDs
        const hotelIds = hotels.map((hotel) => hotel._id);
        console.log("Hotel IDs:", hotelIds);

        // If no hotels found, return empty data in expected format
        if (hotelIds.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        totalStats: {
                            totalOrders: 0,
                            totalEarnings: 0
                        },
                        currentMonthStats: {
                            totalEarnings: 0
                        },
                        todaysOrders: 0,
                        todaysRevenue: 0,
                        weeklyStats: []
                    },
                    "Partner Dashboard Data Fetched Successfully",
                ),
            );
        }

        // Define date ranges using moment for consistent timezone handling
        const startOfToday = moment().startOf('day').toDate();
        const endOfToday = moment().endOf('day').toDate();

        const startOfMonth = moment().startOf("month").toDate();
        const endOfMonth = moment().endOf("month").toDate();

        // Calculate start of week (7 days ago including today)
        const startOfWeek = moment().subtract(6, 'days').startOf('day').toDate();
        const endOfWeek = moment().endOf('day').toDate();

        console.log("Date range - Today:", startOfToday, "to", endOfToday);
        console.log("Date range - Month start:", startOfMonth);
        console.log("Date range - Week start:", startOfWeek);

        // 1. Calculate total orders count (all time)
        const totalOrders = await orderModel.countDocuments({
            hotelId: { $in: hotelIds }
        });

        // 2. Calculate total earnings (all time) from PartnerSettlement
        // Only count delivered orders (orderStatus: 3)
        const totalEarningsResult = await PartnerSettlement.aggregate([
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "order"
                }
            },
            {
                $unwind: "$order"
            },
            {
                $match: {
                    hotelId: { $in: hotelIds },
                    "order.orderStatus": 3 // Only delivered orders
                }
            },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: "$totalPartnerEarning" }
                }
            }
        ]);
        const totalEarnings = totalEarningsResult.length > 0 ? totalEarningsResult[0].totalEarnings : 0;

        // 3. Calculate monthly earnings
        const monthlyEarningsResult = await PartnerSettlement.aggregate([
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "order"
                }
            },
            {
                $unwind: "$order"
            },
            {
                $match: {
            hotelId: { $in: hotelIds },
                    "order.orderStatus": 3,
                    "order.createdAt": {
                        $gte: startOfMonth,
                        $lte: endOfMonth
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: "$totalPartnerEarning" }
                }
            }
        ]);
        const monthlyEarnings = monthlyEarningsResult.length > 0 ? monthlyEarningsResult[0].totalEarnings : 0;

        // 4. Calculate today's orders and earnings
        const todaysOrders = await orderModel.countDocuments({
            hotelId: { $in: hotelIds },
            createdAt: { $gte: startOfToday, $lte: endOfToday }
        });

        const todaysEarningsResult = await PartnerSettlement.aggregate([
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "order"
                }
            },
            {
                $unwind: "$order"
            },
            {
                $match: {
                    hotelId: { $in: hotelIds },
                    "order.orderStatus": 3,
                    "order.createdAt": {
                        $gte: startOfToday,
                        $lte: endOfToday
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: "$totalPartnerEarning" }
                }
            }
        ]);
        const todaysRevenue = todaysEarningsResult.length > 0 ? todaysEarningsResult[0].totalEarnings : 0;

        // 5. Calculate weekly stats breakdown (last 7 days)
        // Get earnings from settlements
        const weeklyEarningsResult = await PartnerSettlement.aggregate([
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "order"
                }
            },
            {
                $unwind: "$order"
            },
            {
                $match: {
                    hotelId: { $in: hotelIds },
                    "order.orderStatus": 3,
                    "order.createdAt": {
                        $gte: startOfWeek,
                        $lte: endOfWeek
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$order.createdAt" }
                    },
                    totalEarnings: { $sum: "$totalPartnerEarning" }
                }
            },
            {
                $project: {
                    date: "$_id",
                    totalEarnings: 1,
                    _id: 0
                }
            }
        ]);
        
        // Get order counts from orders collection (source of truth for order counts)
        const weeklyOrdersResult = await orderModel.aggregate([
            {
                $match: {
            hotelId: { $in: hotelIds }, 
                    orderStatus: 3,
                    createdAt: {
                        $gte: startOfWeek,
                        $lte: endOfWeek
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    totalOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    date: "$_id",
                    totalOrders: 1,
                    _id: 0
                }
            }
        ]);

        // Merge weekly stats and format day names
        const weeklyStatsMap = new Map();
        
        // Initialize all 7 days with zero values
        for (let i = 6; i >= 0; i--) {
            const date = moment().subtract(i, 'days');
            const dateStr = date.format('YYYY-MM-DD');
            const dayName = date.format('dddd'); // Monday, Tuesday, etc.
            weeklyStatsMap.set(dateStr, {
                day: dayName,
                totalOrders: 0,
                totalEarnings: 0
            });
        }

        // Update with earnings data
        weeklyEarningsResult.forEach(stat => {
            if (weeklyStatsMap.has(stat.date)) {
                weeklyStatsMap.get(stat.date).totalEarnings = stat.totalEarnings;
            }
        });

        // Update with order counts from orders collection
        weeklyOrdersResult.forEach(stat => {
            if (weeklyStatsMap.has(stat.date)) {
                weeklyStatsMap.get(stat.date).totalOrders = stat.totalOrders;
            }
        });

        // Convert map to array
        const weeklyStats = Array.from(weeklyStatsMap.values());

        console.log("Dashboard Results:", {
            totalOrders,
            totalEarnings,
            monthlyEarnings,
            todaysOrders,
            todaysRevenue,
            weeklyStats
        });

        // Respond with the data in the format expected by frontend
        res.status(200).json(
            new ApiResponse(
                200,
                {
                    totalStats: {
                        totalOrders,
                        totalEarnings
                    },
                    currentMonthStats: {
                        totalEarnings: monthlyEarnings
                    },
                    todaysOrders,
                    todaysRevenue,
                    weeklyStats
                },
                "Partner Dashboard Data Fetched Successfully",
            ),
        );
    } catch (error) {
        console.error("Error in getPartnerDashboard:", error);
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

    // Calculate date filters based on user input or default to current month
    // Use order creation date for filtering, not settlement creation date
    let orderDateFilter = {};
    if (startDate && endDate) {
        const sDate = moment(startDate).startOf('day').toDate();
        const eDate = moment(endDate).endOf('day').toDate();
        orderDateFilter.createdAt = {
            $gte: sDate,
            $lte: eDate,
        };
    } else {
        // Default to current month
        const startOfMonth = moment().startOf("month").toDate();
        const endOfMonth = moment().endOf("month").toDate();
        orderDateFilter.createdAt = {
            $gte: startOfMonth,
            $lte: endOfMonth,
        };
    }

    // Fetch partner settlements from PartnerSettlement collection
    // Use aggregation to filter by order creation date (not settlement creation date)
    const PartnerSettlement = require("../models/Partner-Settlements/partner-settlement");
    const Order = require("../models/order.model");
    
    // Use aggregation to properly filter by order creation date
    const settlementsResult = await PartnerSettlement.aggregate([
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "order"
            }
        },
        {
            $unwind: "$order"
        },
        {
            $match: {
        hotelId: { $in: hotelIds },
                "order.orderStatus": 3, // Only delivered orders
                "order.createdAt": orderDateFilter.createdAt
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$order.createdAt" }
                },
                totalEarnings: { $sum: "$totalPartnerEarning" },
                settlements: { $push: "$$ROOT" }
            }
        },
        {
            $project: {
                date: "$_id",
                totalEarnings: 1,
                settlements: 1,
                _id: 0
            }
        },
        {
            $sort: { date: 1 }
        }
    ]);

    // Calculate total earnings and daily breakdown
    let totalEarnings = 0;
    const dailyEarnings = {};
    let totalSettlements = 0;
    let settledAmount = 0;
    let pendingAmount = 0;
    
    settlementsResult.forEach((dayData) => {
        totalEarnings += dayData.totalEarnings;
        dailyEarnings[dayData.date] = dayData.totalEarnings;
        
        // Calculate settlement status breakdown
        if (dayData.settlements && Array.isArray(dayData.settlements)) {
            dayData.settlements.forEach((settlement) => {
                totalSettlements++;
                if (settlement.isSettled) {
                    settledAmount += settlement.totalPartnerEarning || 0;
                } else {
                    pendingAmount += settlement.totalPartnerEarning || 0;
                }
            });
        }
    });

    // Prepare response
    const response = {
        totalEarnings,
        dailyEarnings: Object.entries(dailyEarnings)
            .map(([date, earnings]) => ({ date, earnings }))
            .sort((a, b) => a.date.localeCompare(b.date)), // Sort by date
        // Add settlement status breakdown for better visibility
        totalSettlements,
        settledAmount,
        pendingAmount,
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

exports.updatePartner = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
    const { name, email, phoneNumber } = req.body;

    const partner = await Partner.findByIdAndUpdate(
        partnerId,
        {
            $set: {
                name,
                email,
                phoneNumber,
            },
        },
        { new: true },
    );

    res.status(200).json(
        new ApiResponse(200, partner, "Partner Updated Successfully"),
    );
});
