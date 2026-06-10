const videoAddModel = require("../models/videoAdd.model");
const Admin = require("../models/admin.model");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { generateTokens } = require("../utils/generateToken");
const DeliveryBoy = require("../models/deliveryBoy.model");
const DeliverBoyDocument = require("../models/userDocument.model");
const Data = require("../models/data.model");
const deliveryChargesModel = require("../models/deliveryCharges.model");
const userAddress = require("../models/userAddress.model");
const Hotel = require("../models/hotel.model");
const HotelDish = require("../models/hotelDish.model");
const Category = require("../models/category.model");
const PinCodeModel = require("../models/pincode.model");
const Partner = require("../models/partner.model");
const User = require("../models/user.model");
const UserAddress = require("../models/userAddress.model");
const { responseMessage, cookieOptions } = require("../constant");
const { deleteFile } = require("../utils/deleteFile");
const { getIO } = require("../utils/socket");
const Order = require("../models/order.model");
const moment = require("moment");
const userTrackModel = require("../models/userTrack.model");
const { Types } = require("mongoose");
const { v4: uuidV4 } = require("uuid");
const adminAnalytics = require("../services/adminAnalytics.service");
const { buildOrderDateMatch } = require("../utils/analyticsDateRange");

/**
 *  @function registerAdmin
 * @async
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @throws {ApiError} Throws an ApiError if validation or registration fails
 *  @description This asynchronous function handles the registration of an admin user.
 * It extracts email and password from the request body, validates the fields, checks for existing admin,
 * creates a new admin, and returns the registered admin details in the response.
 */
exports.registerAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const existedAdmin = await Admin.findOne({ email: email });
    if (existedAdmin) {
        throw new ApiError(409, responseMessage.adminMessage.adminExist);
    }
    const admin = await Admin.create({ email, password });
    const createdAdmin = await Admin.findById(admin._id).select(
        "-password -refreshToken",
    );
    if (!createdAdmin) {
        throw new ApiError(
            500,
            responseMessage.adminMessage.adminRegisterError,
        );
    }
    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                createdAdmin,
                responseMessage.adminMessage.adminRegisterSuccessfully,
            ),
        );
});

/**
 *  @function loginAdmin
 * @async
 * @param {import("express").Request} req - Express request object
 *  @param {import("express").Response} res - Express response object
 * @throws {ApiError} Throws an ApiError if validation or login fails
 *  @description  * @description This asynchronous function handles admin login. It validates the provided email and password,
 * generates access and refresh tokens upon successful login, sets cookies with the tokens, and sends a response
 * indicating the login status along with the user details (excluding password and refreshToken).
 */
exports.loginAdmin = asyncHandler(async (req, res) => {
    // Extract admin login details from the request body
    const { email, password } = req.body;

    // Find a user with the provided email in the database
    const admin = await Admin.findOne({ email: email });

    // If the user is not found, return a 404 response
    if (!admin) {
        throw new ApiError(404, responseMessage.userMessage.userNotFound);
    }

    // Check if the provided password is correct
    const isPasswordValid = await admin.isPasswordCorrect(password);

    // If the password is incorrect, return a 401 response
    if (!isPasswordValid) {
        throw new ApiError(401, responseMessage.userMessage.incorrectPassword);
    }

    // Generate access and refresh tokens for the logged-in user
    const { accessToken, refreshToken } = await generateTokens(admin._id, 1);

    // Retrieve the logged-in user details excluding password and refreshToken
    const loggedInUser = await Admin.findById(admin._id).select(
        "-password -refreshToken",
    );

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
                    accessToken,
                    refreshToken,
                },
                responseMessage.userMessage.loginSuccessful,
            ),
        );
});

exports.getAllUsers = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const {
        q,
        startDate,
        populate,
        status,
        sortByOrderCount,
        isBlocked = 0,
    } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");

    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Search based on user query
    if (q) {
        dbQuery = {
            $or: [
                { name: { $regex: `^${q}`, $options: "i" } },
                { email: { $regex: `^${q}` } },
                { phoneNumber: { $regex: `^${q}`, $options: "i" } },
            ],
        };
    }
    // Sort by date range
    if (startDate) {
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        sDate.setHours(0, 0, 0, 0);
        eDate.setHours(23, 59, 59, 999);
        dbQuery.createdAt = {
            $gte: sDate,
            $lte: eDate,
        };
    }

    // Sort by status
  // Only apply isOnline filter if status is explicitly set (not "", null, or undefined)
  if (status !== undefined && status !== "" && status !== null) {
    if (status === "false" || status === "0" || status === 0 || status === false) {
      dbQuery.isOnline = false;
    } else if (status === "true" || status === "1" || status === 1 || status === true) {
      dbQuery.isOnline = true;
    }
  }
  

    // Sort by status
    if (isBlocked == 1) {
        dbQuery.status = 1;
    }

    const dataCount = await User.countDocuments(dbQuery);

    let usersAggregation = [
        {
            $match: dbQuery,
        },
        {
            $lookup: {
                from: "orders",
                localField: "_id",
                foreignField: "userId",
                as: "userOrders",
            },
        },
        {
            $addFields: {
                orderCount: { $size: "$userOrders" }, // Calculate the count of orders
            },
        },
        {
            $project: {
                password: 0,
                refreshToken: 0,
                userOrders: 0, // Exclude the userOrders field from the result
            },
        },
        {
            $sort:
                sortByOrderCount == 1 ? { orderCount: -1 } : { createdAt: -1 }, // Sort by orderCount if query parameter is present
        },
        {
            $skip: skip,
        },
        {
            $limit: pageSize,
        },
    ];

    // Conditionally add $lookup stage if populate is true
    if (populate && Number(populate) === 1) {
        usersAggregation.splice(1, 0, {
            // Insert $lookup stage after $match
            $lookup: {
                as: "userAddresses",
                from: "useraddresses",
                foreignField: "userId",
                localField: "_id",
            },
        });
    }

    const users = await User.aggregate(usersAggregation).exec();

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + users.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                content: users,
                startItem,
                endItem,
                currentPage: pageNumber,
                totalPages,
                pagesize: users.length,
                totalDoc: dataCount,
            },
            responseMessage.userDataFetchedSuccessfully,
        ),
    );
});

exports.getAllPartner = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { q, startDate, populate, status } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    //search based on user query
    if (q) {
        dbQuery = {
            $or: [
                { name: { $regex: `^${q}`, $options: "i" } },
                { email: { $regex: `^${q}` } },
                { phoneNumber: { $regex: `^${q}`, $options: "i" } },
            ],
        };
    }
    //sort by status
    if (status) {
        dbQuery.status = Number(status);
    }
    // sort by date rang
    if (startDate) {
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        sDate.setHours(0, 0, 0, 0);
        eDate.setHours(23, 59, 59, 999);
        dbQuery = {
            createdAt: {
                $gte: sDate,
                $lte: eDate,
            },
        };
    }
    const dataCount = await Partner.countDocuments();
    let partnerAggregation = [
        { $match: dbQuery },
        { $skip: skip },
        {
            $project: { password: 0, refreshToken: 0 }, // Exclude password and refreshToken fields from the result
        },
        {
            $limit: pageSize,
        },
    ];
    if (populate && Number(populate) === 1) {
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

    const users = await Partner.aggregate(partnerAggregation).exec();
    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + users.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                content: users,
                startItem,
                endItem,
                currentPage: pageNumber,
                totalPages,
                pagesize: users.length,
                totalDoc: dataCount,
            },
            responseMessage.userDataFetchedSuccessfully,
        ),
    );
});

exports.getAllDeliveryBoy = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { q, startDate, populate, status, isOnline } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Search based on user query
    if (q) {
        dbQuery = {
            $or: [
                { name: { $regex: `^${q}`, $options: "i" } },
                { email: { $regex: `^${q}` } },
                { phoneNumber: { $regex: `^${q}`, $options: "i" } },
            ],
        };
    }

    // Sort by status
    if (status) {
        dbQuery.status = Number(status);
    }

    // Sort by date range
    if (startDate) {
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        sDate.setHours(0, 0, 0, 0);
        eDate.setHours(23, 59, 59, 999);
        dbQuery.createdAt = {
            $gte: sDate,
            $lte: eDate,
        };
    }

    if (isOnline !== undefined && isOnline !== "" && isOnline !== null) {
        if (isOnline === "true" || isOnline === true || isOnline === "1" || isOnline === 1) {
            dbQuery.isOnline = true;
        } else if (isOnline === "false" || isOnline === false || isOnline === "0" || isOnline === 0) {
            dbQuery.isOnline = false;
        }
    }

    const dataCount = await DeliveryBoy.countDocuments(dbQuery);

    let deliveryBoyAggregation = [
        {
            $match: dbQuery,
        },
        {
            $sort: { createdAt: -1 }, // Sort by createdAt field in descending order (latest first)
        },
        {
            $project: { password: 0, refreshToken: 0 }, // Exclude password and refreshToken fields from the result
        },
        {
            $skip: skip,
        },
        {
            $limit: pageSize,
        },
    ];
    
    // Conditionally add $lookup stage if populate is true
    if (populate && Number(populate) === 1) {
        deliveryBoyAggregation.splice(
            1,
            0,
            {
                // Insert $lookup stage after $match
                $lookup: {
                    as: "userDocuments",
                    from: "userdocuments",
                    foreignField: "userId",
                    localField: "_id",
                },
            },
            {
                $lookup: {
                    as: "totalDeliveredOrders",
                    from: "orders",
                    foreignField: "assignedDeliveryBoy",
                    localField: "_id",
                    pipeline: [
                        {
                            $match: {
                                // Add conditions to exclude compensated orders
                                compensationPaidToDeliveryBoy: { $ne: true }, // Assuming "compensationPaid" field exists and is a boolean
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                totalDelivery: { $sum: 1 },
                                totalDeliveryPrice: {
                                    $sum: "$totalPrice",
                                },
                            },
                        },
                    ],
                },
            },
        );
    }
    
    // Always add lookup for active orders to determine busy status
    // Insert after $sort but before $project stage
    // Find the index of $project stage (it shifts if populate is true)
    const projectIndex = deliveryBoyAggregation.findIndex(stage => stage.$project);
    const insertIndex = projectIndex > -1 ? projectIndex : 2;
    
    deliveryBoyAggregation.splice(
        insertIndex,
        0,
        {
            $lookup: {
                as: "activeOrders",
                from: "orders",
                foreignField: "assignedDeliveryBoy",
                localField: "_id",
                pipeline: [
                    {
                        $match: {
                            orderStatus: { 
                                $nin: [7, 3, 4, 5, 8] // Exclude DELIVERED (7) and cancelled statuses (3, 4, 5, 8)
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                isBusy: {
                    $gt: [
                        { $size: { $ifNull: ["$activeOrders", []] } },
                        0
                    ]
                },
                activeOrderCount: {
                    $size: { $ifNull: ["$activeOrders", []] }
                }
            }
        }
    );
    const deliveryBoys = await DeliveryBoy.aggregate(
        deliveryBoyAggregation,
    ).exec();

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + deliveryBoys.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                content: deliveryBoys,
                startItem,
                endItem,
                currentPage: pageNumber,
                totalPages,
                pageSize: deliveryBoys.length,
                totalDoc: dataCount,
            },
            responseMessage.userDataFetchedSuccessfully,
        ),
    );
});

exports.deletedDocument = asyncHandler(async (req, res) => {
    const { id } = req.query;
    const documentToDelete = await DeliverBoyDocument.findById(id);
    if (!documentToDelete) {
        return res
            .status(404)
            .json(
                new ApiResponse(
                    404,
                    null,
                    responseMessage.userMessage.documentNotFound,
                ),
            );
    }
    deleteFile(documentToDelete.local_filePath);
    await DeliverBoyDocument.findOneAndDelete(documentId);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "",
                responseMessage.userMessage.documentDeletedSuccessfully,
            ),
        );
});

exports.updateDeliveryBoyStatus = asyncHandler(async (req, res) => {
    const { deliveryBoyId, status } = req.body;
    const deliveryBoy = await DeliveryBoy.findByIdAndUpdate(
        deliveryBoyId,
        {
            $set: {
                status: status,
            },
        },
        {
            new: true,
        },
    );
    if (!deliveryBoy) {
        return res
            .status(404)
            .json(
                new ApiResponse(
                    404,
                    null,
                    responseMessage.userMessage.deliveryBoyNotFound,
                ),
            );
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deliveryBoy,
                responseMessage.userMessage.deliveryBoyStatusUpdatedSuccessfully,
            ),
        );
});

exports.updateDeliveryBoyDocumentStatus = asyncHandler(async (req, res) => {
    const { documentId, status } = req.body;
    const document = await DeliverBoyDocument.findByIdAndUpdate(
        documentId,
        {
            $set: {
                documentStatus: status,
            },
        },
        {
            new: true,
        },
    );
    if (!document) {
        return res
            .status(404)
            .json(
                new ApiResponse(
                    404,
                    null,
                    responseMessage.userMessage.documentNotFound,
                ),
            );
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                document,
                responseMessage.userMessage.documentStatusUpdatedSuccessfully,
            ),
        );
});

exports.updateUserStatus = asyncHandler(async (req, res) => {
    const { userId, status } = req.body;
    const user = await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                status: status,
            },
        },
        {
            new: true,
        },
    );
    if (!user) {
        return res
            .status(404)
            .json(
                new ApiResponse(
                    404,
                    null,
                    responseMessage.userMessage.userNotFound,
                ),
            );
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                responseMessage.userMessage.userStatusUpdatedSuccessfully,
            ),
        );
});

exports.updatePartnerStatus = asyncHandler(async (req, res) => {
    const { partnerId, status } = req.body;
    const partner = await Partner.findByIdAndUpdate(
        partnerId,
        {
            $set: {
                status: status,
            },
        },
        {
            new: true,
        },
    );
    if (!partner) {
        return res
            .status(404)
            .json(
                new ApiResponse(
                    404,
                    null,
                    responseMessage.userMessage.userNotFound,
                ),
            );
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                partner,
                responseMessage.userMessage.partnerStatusUpdatedSuccessfully,
            ),
        );
});

exports.updateHotelStatus = asyncHandler(async (req, res) => {
    const { hotelId, status, isTop } = req.body;
    let option = {
        hotelStatus: status,
    };

    if (isTop) {
        option.isTop = isTop;
    }
    const hotel = await Hotel.findByIdAndUpdate(
        hotelId,
        {
            $set: option,
        },
        {
            new: true,
        },
    );
    if (!hotel) {
        return res
            .status(404)
            .json(
                new ApiResponse(
                    404,
                    null,
                    responseMessage.userMessage.hotelNotFound,
                ),
            );
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                hotel,
                responseMessage.userMessage.hotelUpdatedSuccessfully,
            ),
        );
});

exports.getHotelByCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    let hotels = await Hotel.find({ category: categoryId });
    if (hotels) {
        console.log(hotels);
        res.status(200)
            .json({
                message: "Hotels Found",
                data: hotels
            })

    }
    else {
        res.status(200)
            .json({
                message: "No Hotels Found",
                data: hotels,
                length: hotels.length
            })
    }
});
exports.getAllHotel = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { categoryId } = req.params;
    const { q, startDate, populate, status, sort } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Search based on user query
    if (q) {
        dbQuery = {
            $or: [
                { hotelName: { $regex: `^${q}`, $options: "i" } },
                { hotelName: { $regex: `^${q}` } },
            ],
        };
    }

    // Filter by status
    if (status) {
        dbQuery.hotelStatus = status;
    }

    // Filter by date range
    if (startDate) {
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        sDate.setHours(0, 0, 0, 0);
        eDate.setHours(23, 59, 59, 999);
        dbQuery.createdAt = {
            $gte: sDate,
            $lte: eDate,
        };
    }

    // Filter by category
    if (categoryId) {
        dbQuery.category = { $in: [new Types.ObjectId(categoryId)] };
    }

    const dataCount = await Hotel.countDocuments(dbQuery);

    let hotelAggregation = [
        {
            $match: dbQuery,
        },
        {
            $sort: { createdAt: -1 }, // Sort by createdAt field in descending order (latest first)
        },
        {
            $project: { password: 0, refreshToken: 0 }, // Exclude password and refreshToken fields from the result
        },
        {
            $skip: skip,
        },
        {
            $limit: pageSize,
        },
    ];

    // Conditionally add $lookup stage if populate is true
    if (populate && Number(populate) === 1) {
        // Add a lookup stage to fetch hotel owner details
        hotelAggregation.splice(
            1,
            0,
            {
                $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categories",
                    pipeline: [{ $project: { _id: 1, name: 1, image_url: 1 } }],
                },
            },
            // {
            //     $unwind: {
            //         path: "$categories",
            //         preserveNullAndEmptyArrays: true,
            //     },
            // },
            {
                $lookup: {
                    from: "partners",
                    localField: "userId",
                    foreignField: "_id",
                    as: "hotelOwner",
                    pipeline: [
                        {
                            $project: {
                                name: 1,
                                profile_image: 1,
                                email: 1,
                                phoneNumber: 1,
                                status: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$hotelOwner",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "hotelstars",
                    localField: "_id",
                    foreignField: "hotelId",
                    as: "hotelstars",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "user",
                                pipeline: [
                                    {
                                        $project: {
                                            name: 1,
                                            profile_image: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $unwind: {
                                path: "$user",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$hotelstars",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: {
                        hotelId: "$_id",
                        hotelName: "$hotelName",
                        image_url: "$image_url",
                        isOnline: "$isOnline",
                        address: "$address",
                        hotelOwner: "$hotelOwner",
                        categories: "$categories",
                    },
                    totalCount: { $sum: 1 },
                    "1starCount": {
                        $sum: {
                            $cond: [{ $eq: ["$hotelstars.star", 1] }, 1, 0],
                        },
                    },
                    "2starCount": {
                        $sum: {
                            $cond: [{ $eq: ["$hotelstars.star", 2] }, 1, 0],
                        },
                    },
                    "3starCount": {
                        $sum: {
                            $cond: [{ $eq: ["$hotelstars.star", 3] }, 1, 0],
                        },
                    },
                    "4starCount": {
                        $sum: {
                            $cond: [{ $eq: ["$hotelstars.star", 4] }, 1, 0],
                        },
                    },
                    "5starCount": {
                        $sum: {
                            $cond: [{ $eq: ["$hotelstars.star", 5] }, 1, 0],
                        },
                    },
                    starData: { $push: "$hotelstars" },
                },
            },
            {
                $project: {
                    _id: 0,
                    hotelId: "$_id.hotelId",
                    isOnline: "$_id.isOnline",
                    hotelName: "$_id.hotelName",
                    image_url: "$_id.image_url",
                    address: "$_id.address",
                    categories: "$_id.categories",
                    starCounts: {
                        "1starCount": { $ifNull: ["$1starCount", 0] },
                        "2starCount": { $ifNull: ["$2starCount", 0] },
                        "3starCount": { $ifNull: ["$3starCount", 0] },
                        "4starCount": { $ifNull: ["$4starCount", 0] },
                        "5starCount": { $ifNull: ["$5starCount", 0] },
                        totalCount: { $ifNull: ["$totalCount", 0] },
                    },
                    ratingData: {
                        $cond: {
                            if: { $gt: [{ $size: "$starData" }, 0] },
                            then: "$starData",
                            else: [],
                        },
                    },
                    partner: { $ifNull: ["$_id.hotelOwner", {}] },
                },
            },
        );
    }

    // Conditionally add sort stage if sort is 'toprated'
    if (sort && sort === "tr") {
        hotelAggregation.push({
            $sort: {
                "starCounts.totalCount": -1, // Sort by total star count in descending order
            },
        });
    }

    const hotel = await Hotel.aggregate(hotelAggregation).exec();

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + hotel.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                content: hotel,
                startItem,
                endItem,
                currentPage: pageNumber,
                totalPages,
                pageSize: hotel.length,
                totalDoc: dataCount,
            },
            responseMessage.hotelFetchedSuccessfully,
        ),
    );
});

exports.getHotelsForUser = asyncHandler(async (req, res) => {
    
    const hotels = await Hotel.find({}).populate('category');
    if (hotels) {
        return res.status(200).json(
            new ApiResponse(
                200,
                hotels,
                responseMessage.userMessage.hotelFetchedSuccessfully,
            ),
        );
    } else {
        return res.status(404).json(
            new ApiResponse(
                404,
                null,
                responseMessage.userMessage.hotelNotFound,
            ),
        );
    }

});

exports.addCategory = asyncHandler(async (req, res) => {
    const { categoryName } = req.body;
    const category = await Category.findOne({ categoryName });
    if (category) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    null,
                    responseMessage.userMessage.categoryAlreadyExist,
                ),
            );
    }
    const newCategory = await Category.create({
        name: categoryName,
    });
    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                newCategory,
                responseMessage.userMessage.categoryCreatedSuccessfully,
            ),
        );
});

exports.uploadCategoryImage = asyncHandler(async (req, res) => {
    const { categoryId } = req.body;
    // console.log(req.file);
    const { filename } = req.file;
    const local_filePath = `upload/${filename}`;
    let document_url = `https://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        document_url = `https://${req.hostname}/upload/${filename}`;
    }
    const savedCategory = await Category.findById(categoryId);
    if (savedCategory) {
        deleteFile(savedCategory?.local_imagePath);
    }
    const categoryDocument = await Category.findByIdAndUpdate(
        categoryId,
        {
            $set: {
                image_url: document_url,
                local_imagePath: local_filePath,
            },
        },
        {
            new: true,
        },
        { validateBeforeSave: false },
    );
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                categoryDocument,
                responseMessage.userMessage.categoryImageUploadedSuccessfully,
            ),
        );
});


exports.getAllCategoryNormal = async (req, res) => {
    try {

    } catch (error) {

    }
}

exports.getAllCategory = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { search } = req.query;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Search based on user query
    if (search) {
        dbQuery = {
            $or: [{ name: { $regex: `^${search}`, $options: "i" } }],
        };
    }
    const dataCount = await Category.countDocuments();
    const category = await Category.find(dbQuery).skip(skip).limit(pageSize);
    // const category = await Category.find({});
    console.log(category);

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + category.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                content: category,
                startItem,
                endItem,
                totalPages,
                pagesize: category.length,
                totalDoc: dataCount,
            },
            responseMessage.userMessage.categoryFetchedSuccessfully,
        ),
    );
});

exports.getCategoryById = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId);
    if (!category) {
        return res
            .status(404)
            .json(
                new ApiResponse(
                    404,
                    null,
                    responseMessage.userMessage.categoryNotFound,
                ),
            );
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                category,
                responseMessage.userMessage.categoryFetchedSuccessfully,
            ),
        );
});

exports.deleteCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId);
    if (!category) {
        return res
            .status(404)
            .json(
                new ApiResponse(
                    404,
                    null,
                    responseMessage.userMessage.categoryNotFound,
                ),
            );
    }
    deleteFile(category?.local_imagePath);
    await Category.findByIdAndDelete(categoryId);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "ok",
                responseMessage.userMessage.categoryDeletedSuccessfully,
            ),
        );
});

exports.sendOrderPickUpRequestToDeliveryBoys = asyncHandler(
    async (req, res) => {
        console.log('📥 [sendOrderPickUpRequestToDeliveryBoys] Function called');
        console.log('   Request body:', JSON.stringify(req.body, null, 2));
        
        // Accept both 'deliveryBoys' and 'deliveryBoyIds' for backward compatibility
        const { deliveryBoys, deliveryBoyIds, orderId } = req.body;
        const deliveryBoysArray = deliveryBoys || deliveryBoyIds;
        
        console.log('   Extracted values:');
        console.log(`     orderId: ${orderId}`);
        console.log(`     deliveryBoys: ${deliveryBoys}`);
        console.log(`     deliveryBoyIds: ${deliveryBoyIds}`);
        console.log(`     deliveryBoysArray: ${JSON.stringify(deliveryBoysArray)}`);

        // Input validation
        if (!orderId) {
            console.log('   ❌ Validation failed: Order ID is required');
            return res.status(400).json(
                new ApiResponse(400, null, "Order ID is required")
            );
        }

        if (!deliveryBoysArray || !Array.isArray(deliveryBoysArray) || deliveryBoysArray.length === 0) {
            return res.status(400).json(
                new ApiResponse(400, null, "Delivery boys array is required and must not be empty")
            );
        }

        // Validate orderId format
        if (!Types.ObjectId.isValid(orderId)) {
            return res.status(400).json(
                new ApiResponse(400, null, "Invalid order ID format")
            );
        }

        // Validate all delivery boy IDs
        const invalidIds = deliveryBoysArray.filter(id => !Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            return res.status(400).json(
                new ApiResponse(400, null, `Invalid delivery boy ID format(s): ${invalidIds.join(', ')}`)
            );
        }

        // Find order with populated hotel info
        let order = await Order.findById(orderId)
            .populate({
                path: "hotelId",
                select: "hotelName address location",
            })
            .populate({
                path: "userId",
                select: "name phoneNumber",
            })
            .populate({
                path: "address",
                select: "address location",
            });

        if (!order) {
            return res.status(404).json(
                new ApiResponse(404, null, "Order not found")
            );
        }

        // Validate order status - only assign if order is accepted by admin (status 4) or being prepared (status 1)
        if (![1, 4].includes(order.orderStatus)) {
            return res.status(400).json(
                new ApiResponse(400, null, `Order cannot be assigned at this stage. Order must be accepted by admin (status 4) or being prepared (status 1). Current status: ${order.orderStatus}`)
            );
        }

        // Validate delivery boys exist and are active
        const deliveryBoysList = await DeliveryBoy.find({ 
            _id: { $in: deliveryBoysArray },
            status: 2,
            isOnline: true,
        });

        if (deliveryBoysList.length !== deliveryBoysArray.length) {
            const foundIds = deliveryBoysList.map(db => db._id.toString());
            const missingIds = deliveryBoysArray.filter(id => !foundIds.includes(id.toString()));
            return res.status(400).json(
                new ApiResponse(400, null, `Some delivery boys not found, inactive, or offline: ${missingIds.join(', ')}`)
            );
        }

        // Get Socket.IO instance
        const io = getIO();

        // Prepare pickup request payload
        const pickupRequestPayload = {
            type: "NEW_PICKUP_REQUEST",
            orderId: order.orderId,
            order: order,
            hotel: order.hotelId,
            customer: order.userId,
            deliveryAddress: order.address,
            timestamp: new Date(),
            message: `New pickup request for order ${order.orderId}`,
            priority: "high",
            // Additional useful information
            totalAmount: order.priceDetails?.totalAmountToPay || 0,
            itemCount: order.products?.length || 0,
            paymentMode: order.paymentMode,
        };

        // Populate order with full details before sending (initial population)
        let populatedOrder = await Order.findById(order._id)
            .populate({
                path: "hotelId",
                select: "hotelName address phoneNumber",
            })
            .populate({
                path: "userId",
                select: "name phoneNumber",
            })
            .populate({
                path: "address",
                select: "address location",
            })
            .populate({
                path: "products.dishId",
                select: "dishName userPrice partnerPrice",
            });

        const assignedHotel = populatedOrder?.hotelId || order.hotelId || {};

        // Update order status FIRST before sending notifications
        // This ensures the order is in the correct state when delivery boys receive it
        if ([1, 4].includes(order.orderStatus)) {
            // Convert all delivery boy IDs to ObjectIds
            const deliveryBoyObjectIds = deliveryBoysArray.map(id => {
                // Handle both string and ObjectId formats
                if (id instanceof Types.ObjectId) {
                    return id;
                }
                return new Types.ObjectId(id.toString());
            });
            
            order.orderStatus = 2;
            order.assignedDeliveryBoys = deliveryBoyObjectIds;
            order.markModified("assignedDeliveryBoys");
            order.assignedDeliveryBoy = null; // Will be set when a delivery boy accepts
            // Add timeline entry
            order.orderTimeline.push({
                title: `Order assigned to ${deliveryBoysArray.length} delivery boy(s)`,
                dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
                status: "ASSIGNED_TO_MULTIPLE",
            });
            
            // Save and wait for it to complete
            const savedOrder = await order.save();
            console.log(`✅ Order ${order.orderId} updated: status=2, assignedDeliveryBoys=${deliveryBoysArray.length}`);
            console.log(`   Saved order assignedDeliveryBoys:`, savedOrder.assignedDeliveryBoys?.map(id => id.toString()));
            
            // Refresh the order from database to ensure we have the latest data
            const refreshedOrder = await Order.findById(order._id)
                .populate({
                    path: "hotelId",
                    select: "hotelName address phoneNumber",
                })
                .populate({
                    path: "userId",
                    select: "name phoneNumber",
                })
                .populate({
                    path: "address",
                    select: "address location",
                })
                .populate({
                    path: "products.dishId",
                    select: "dishName userPrice partnerPrice",
                });
            
            // Use refreshed order for notifications
            if (refreshedOrder) {
                order = refreshedOrder;
                populatedOrder = refreshedOrder;
            }
        }

        // Send orderAssigned event to each selected delivery boy
        // This makes the order visible only to these assigned delivery boys
        let successCount = 0;
        console.log(`📤 Sending order assignment to ${deliveryBoysArray.length} delivery boys`);
        console.log(`📋 Delivery boy IDs: ${deliveryBoysArray.map(id => id.toString()).join(', ')}`);
        
        deliveryBoysArray.forEach((deliveryBoyId) => {
            try {
                const orderAssignedPayload = {
                    type: "ORDER_ASSIGNED",
                    orderId: order.orderId,
                    order: populatedOrder || order,
                    hotel: assignedHotel,
                    timestamp: new Date().toISOString(), // Convert to ISO string for client compatibility
                    message: `Order ${order.orderId} has been assigned to you`,
                    priority: "high",
                    totalAmount: order.priceDetails?.totalAmountToPay || 0,
                    itemCount: order.products?.length || 0,
                    paymentMode: order.paymentMode,
                    hotelName: assignedHotel.hotelName || assignedHotel.name,
                    hotelAddress: assignedHotel.address,
                };

                // Convert deliveryBoyId to string to ensure proper room matching
                const deliveryBoyIdStr = deliveryBoyId.toString().trim();
                const roomName = `deliveryBoy_${deliveryBoyIdStr}`;
                
                // Check if there are any sockets in this room
                const room = io.sockets.adapter.rooms.get(roomName);
                const roomSize = room ? room.size : 0;
                
                // Get all connected rooms for debugging
                const allRooms = Array.from(io.sockets.adapter.rooms.keys());
                const deliveryBoyRooms = allRooms.filter(r => r.startsWith('deliveryBoy_'));
                
                console.log(`🔍 Checking room for delivery boy ${deliveryBoyIdStr}:`);
                console.log(`   Room name: "${roomName}"`);
                console.log(`   Room exists: ${room !== undefined}`);
                console.log(`   Sockets in room: ${roomSize}`);
                console.log(`   All delivery boy rooms: ${deliveryBoyRooms.join(', ') || 'none'}`);
                
                // Log the payload being sent
                console.log(`📦 Emitting orderAssigned event with payload:`, {
                    orderId: orderAssignedPayload.orderId,
                    type: orderAssignedPayload.type,
                    hotelName: orderAssignedPayload.hotelName,
                    targetDeliveryBoyId: deliveryBoyIdStr,
                });
                
                // ALWAYS emit the event - Socket.IO will deliver it when the client connects
                // This ensures delivery even if there's a timing issue
                // Emit immediately
                io.to(roomName).emit("orderAssigned", orderAssignedPayload);
                console.log(`   ✅ Emitted to room: ${roomName}`);
                
                // Also emit after a small delay to ensure order is saved (backup)
                setTimeout(() => {
                    io.to(roomName).emit("orderAssigned", {
                        ...orderAssignedPayload,
                        timestamp: new Date().toISOString(), // Update timestamp for retry
                        retry: true, // Mark as retry so client can handle duplicates
                    });
                    console.log(`   ✅ Emitted to room: ${roomName} (retry after delay)`);
                }, 500); // 500ms delay to ensure database save completes
                
                // Also try emitting to the socket directly if we can find it
                const socketsInRoom = room ? Array.from(room) : [];
                if (socketsInRoom.length > 0) {
                    socketsInRoom.forEach(socketId => {
                        const socket = io.sockets.sockets.get(socketId);
                        if (socket) {
                            socket.emit("orderAssigned", orderAssignedPayload);
                            console.log(`   ✅ Also sent directly to socket: ${socketId}`);
                        }
                    });
                } else {
                    console.warn(`   ⚠️ No sockets found in room ${roomName} to send direct message`);
                }
                
                // Also try broadcasting to all sockets and let client filter
                // This is a fallback in case room matching fails
                io.emit("orderAssigned", {
                    ...orderAssignedPayload,
                    targetDeliveryBoyId: deliveryBoyIdStr, // Include target ID so client can filter
                });
                console.log(`   ✅ Also broadcasted globally (client should filter by targetDeliveryBoyId)`);
                
                if (roomSize > 0) {
                    console.log(`✅ Order assigned notification sent to delivery boy: ${deliveryBoyIdStr} (${roomSize} socket(s) in room: ${roomName})`);
                    successCount++;
                } else {
                    console.warn(`⚠️ Delivery boy ${deliveryBoyIdStr} is not connected (no sockets in room: ${roomName})`);
                    console.warn(`   Event still emitted - will be delivered when they connect`);
                    // Count as success since we emitted the event
                    successCount++;
                }
            } catch (error) {
                console.error(`❌ Failed to send order assignment to delivery boy ${deliveryBoyId}:`, error);
            }
        });

        console.log(`📊 Assignment Summary: Sent to ${successCount}/${deliveryBoysArray.length} delivery boys`);
        console.log(`📦 Order ID: ${order.orderId}, Status: ${order.orderStatus}`);

        // Emit orderStatusUpdate to customer
        const statusUpdatePayload = {
            type: "ORDER_STATUS_UPDATE",
            orderId: order.orderId,
            order: populatedOrder || order,
            oldStatus: order.orderStatus,
            newStatus: 2, // Delivery Assigned
            timestamp: new Date(),
        };

        io.to(`user_${order.userId}`).emit("orderStatusUpdate", statusUpdatePayload);
        io.to("admin_dashboard").emit("orderStatusUpdate", statusUpdatePayload);

        // Emit orderAssigned to customer
        io.to(`user_${order.userId}`).emit("orderAssigned", {
            type: "ORDER_ASSIGNED_TO_DELIVERY_BOY",
            orderId: order.orderId,
            order: populatedOrder || order,
            timestamp: new Date(),
            message: `Delivery partner assigned to your order ${order.orderId}`,
        });

        // Notify partner/hotel
        if (assignedHotel && assignedHotel.userId) {
            io.to(`partner_${assignedHotel.userId}`).emit("orderStatusUpdate", statusUpdatePayload);
            io.to(`partner_${assignedHotel.userId}`).emit("orderAssignedToDeliveryBoy", {
                type: "ORDER_ASSIGNED_TO_DELIVERY_BOY",
                orderId: order.orderId,
                order: populatedOrder || order,
                deliveryBoyIds: deliveryBoysArray,
                timestamp: new Date(),
            });
        }

        // Ensure the order in response includes assignedDeliveryBoys
        const responseOrder = populatedOrder || order;
        if (responseOrder && !responseOrder.assignedDeliveryBoys) {
            // Fallback: fetch order again to ensure assignedDeliveryBoys is included
            const finalOrder = await Order.findById(order._id)
                .select('assignedDeliveryBoys assignedDeliveryBoy orderStatus orderId')
                .lean();
            if (finalOrder) {
                responseOrder.assignedDeliveryBoys = finalOrder.assignedDeliveryBoys || [];
            }
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    sentTo: successCount,
                    totalRequested: deliveryBoysArray.length,
                    orderId: order.orderId,
                    orderStatus: order.orderStatus,
                    connectedDeliveryBoys: successCount,
                    disconnectedDeliveryBoys: deliveryBoysArray.length - successCount,
                    order: responseOrder,
                    assignedDeliveryBoys: responseOrder?.assignedDeliveryBoys || deliveryBoysArray,
                },
                `Order assigned successfully to ${successCount} delivery boy(s)${successCount < deliveryBoysArray.length ? ` (${deliveryBoysArray.length - successCount} not connected)` : ''}`
            ),
        );
    },
);

exports.getDashboardStats = asyncHandler(async (req, res) => {
    const { sort, startDate, endDate } = req.query;

    let dateMatch = {};
    if (sort || startDate || endDate) {
        if (startDate && endDate) {
            const range = buildOrderDateMatch(startDate, endDate);
            if (range.error) {
                return res.status(400).json(new ApiResponse(400, null, range.error));
            }
            dateMatch = range.match;
        } else {
            const unit = sort || "day";
            dateMatch = {
                createdAt: {
                    $gte: moment().startOf(unit).toDate(),
                    $lte: moment().endOf(unit).toDate(),
                },
            };
        }
    }

    const data = await adminAnalytics.getDashboardKpis(dateMatch);

    res.status(200).json(
        new ApiResponse(200, data, "Dashboard data fetched successfully"),
    );
});

exports.getAnalyticsSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate, granularity = "day", includePrevious = "true" } = req.query;
    const summary = await adminAnalytics.getAnalyticsSummary({
        startDate,
        endDate,
        granularity,
        includePrevious: includePrevious !== "false",
    });

    if (summary.error) {
        return res.status(400).json(new ApiResponse(400, null, summary.error));
    }

    res.status(200).json(
        new ApiResponse(200, summary, "Analytics summary fetched successfully"),
    );
});

exports.getUserLocationClusters = asyncHandler(
    async (req, res) => {

        try {
            const result = await UserAddress.aggregate([
              {
                $group: {
                  _id: {
                    lat: {
                      $round: [
                        { $arrayElemAt: ['$location.coordinates', 1] }, // latitude
                        3,
                      ],
                    },
                    lng: {
                      $round: [
                        { $arrayElemAt: ['$location.coordinates', 0] }, // longitude
                        3,
                      ],
                    },
                  },
                  count: { $sum: 1 },
                },
              },
              {
                $project: {
                  _id: 0,
                  lat: '$_id.lat',
                  lng: '$_id.lng',
                  count: 1,
                },
              },
            ]);
        
            return res.status(200).json({
              success: true,
              message: 'User address locations clustered successfully',
              data: result,
            });
          } catch (error) {
            console.error(error);
            return res.status(500).json({
              success: false,
              message: 'Server error while fetching address clusters',
            });
          }
    });

exports.customerMapChartData = asyncHandler(async (req, res) => {
    const { sort = "month", startDate, endDate } = req.query;
    const data = await adminAnalytics.getCustomerActivityChart({ sort, startDate, endDate });
    res.status(200).json(
        new ApiResponse(
            200,
            data,
            responseMessage.userMessage.customerMapChartDataFetchedSuccessfully,
        ),
    );
});


exports.getOrderWithPopulatedFields = asyncHandler(async (req, res) => {
  const { startDate, endDate, limit = 5 } = req.query;
  const orders = await adminAnalytics.getRecentOrders({ startDate, endDate, limit });
  res.status(200).json({
    success: true,
    data: orders,
  });
});

exports.orderChartData = asyncHandler(async (req, res) => {
    let { sort = "day", startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        const defaults = require("../utils/analyticsDateRange").defaultRangeForGranularity(sort);
        startDate = defaults.startDate;
        endDate = defaults.endDate;
    }

    const range = buildOrderDateMatch(startDate, endDate);
    if (range.error) {
        return res.status(400).json(new ApiResponse(400, null, range.error));
    }

    const chart = await adminAnalytics.getOrderChart(sort, range.match);
    return res.status(200).json(
        new ApiResponse(200, chart, "Order chart data fetched successfully")
    );
});

exports.totalRevenueData = asyncHandler(async (req, res) => {
    let { sort = "day", startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        const defaults = require("../utils/analyticsDateRange").defaultRangeForGranularity(sort);
        startDate = defaults.startDate;
        endDate = defaults.endDate;
    }

    const range = buildOrderDateMatch(startDate, endDate);
    if (range.error) {
        return res.status(400).json(new ApiResponse(400, null, range.error));
    }

    const chart = await adminAnalytics.getRevenueChart(sort, range.match);
    res.status(200).json(
        new ApiResponse(200, chart, responseMessage.userMessage.revenueChartData),
    );
});

exports.orderStatusBreakdown = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    let dateMatch = {};
    if (startDate && endDate) {
        const range = buildOrderDateMatch(startDate, endDate);
        if (range.error) {
            return res.status(400).json(new ApiResponse(400, null, range.error));
        }
        dateMatch = range.match;
    }

    const breakdown = await adminAnalytics.getOrderStatusBreakdown(dateMatch);
    res.status(200).json(
        new ApiResponse(200, breakdown, "Order status breakdown fetched successfully"),
    );
});

exports.topPartners = asyncHandler(async (req, res) => {
    const { startDate, endDate, limit = 10 } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json(new ApiResponse(400, null, "startDate and endDate are required"));
    }
    const data = await adminAnalytics.getTopPartners(startDate, endDate, limit);
    res.status(200).json(new ApiResponse(200, data, "Top partners fetched successfully"));
});

/***** Gst and platform fee data  *****/
// exports.createData = asyncHandler(async (req, res) => {
//     const { gstPercentage, platformFee } = req.body;

//     const data = await Data.create({
//         gstPercentage,
//         platformFee,
//     });
//     res.status(200).json(
//         new ApiResponse(200, data, "Data created successfully"),
//     );
// });


exports.updateData = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { gstPercentage, platformFee } = req.body;
    const data = await Data.findByIdAndUpdate(
        id,
        {
            gstPercentage,
            deliveryCharges,
            platformFee,
        },
        { new: true },
    );
    if (!data) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Data not found"));
    }
    res.status(200).json(
        new ApiResponse(200, data, "Data updated successfully"),
    );
});

/***** Gst and platform fee data  *****/
exports.createData = asyncHandler(async (req, res) => {
    const {
        gstPercentage,
        gstIsActive,
        platformFee,
        deliveryBoyIncentiveFor16delivery,
        deliveryBoyIncentiveFor21delivery,
    } = req.body;

    const data = await Data.create({
        gstPercentage,
        gstIsActive,
        platformFee,
        deliveryBoyIncentiveFor16delivery,
        deliveryBoyIncentiveFor21delivery,
    });
    res.status(200).json(
        new ApiResponse(200, data, "Data created successfully"),
    );
});

exports.getData = asyncHandler(async (req, res) => {
    const data = await Data.find();
    if (!data) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Data not found"));
    }
    res.status(200).json(
        new ApiResponse(200, data, "Data fetched successfully"),
    );
});

exports.updateData = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        gstPercentage,
        gstIsActive,
        platformFee,
        deliveryBoyIncentiveFor16delivery,
        deliveryBoyIncentiveFor21delivery,
    } = req.body;
    const data = await Data.findByIdAndUpdate(
        id,
        {
            gstPercentage,
            gstIsActive,
            platformFee,
            deliveryBoyIncentiveFor16delivery,
            deliveryBoyIncentiveFor21delivery,
        },
        { new: true },
    );
    if (!data) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Data not found"));
    }
    res.status(200).json(
        new ApiResponse(200, data, "Data updated successfully"),
    );
});

/***** Delivery charges data  *****/
exports.createDeliveryChargesData = asyncHandler(async (req, res) => {
    const {
        range1Price,
        range1MinKm,
        range1MaxKm,
        range2Price,
        range2MinKm,
        range2MaxKm,
        range3Price,
        range3MinKm,
        range3MaxKm,
    } = req.body;

    const data = await deliveryChargesModel.create({
        range1Price,
        range1MinKm,
        range1MaxKm,
        range2Price,
        range2MinKm,
        range2MaxKm,
        range3Price,
        range3MinKm,
        range3MaxKm,
    });
    res.status(200).json(
        new ApiResponse(
            200,
            data,
            "Delivery charges data created successfully",
        ),
    );
});

exports.getDeliveryChargesData = asyncHandler(async (req, res) => {
    const data = await deliveryChargesModel.find();
    if (!data) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Data not found"));
    }
    res.status(200).json(
        new ApiResponse(200, data, "Data fetched successfully"),
    );
});

exports.updateDeliveryChargesData = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        range1Price,
        range1MinKm,
        range1MaxKm,
        range2Price,
        range2MinKm,
        range2MaxKm,
        range3Price,
        range3MinKm,
        range3MaxKm,
    } = req.body;
    const data = await deliveryChargesModel.findByIdAndUpdate(
        id,
        {
            range1Price,
            range1MinKm,
            range1MaxKm,
            range2Price,
            range2MinKm,
            range2MaxKm,
            range3Price,
            range3MinKm,
            range3MaxKm,
        },
        { new: true },
    );
    if (!data) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Data not found"));
    }
    res.status(200).json(
        new ApiResponse(200, data, "Data updated successfully"),
    );
});

exports.getMostSellingDishes = asyncHandler(async (req, res) => {
    const { period = "monthly", startDate, endDate } = req.query;

    const result = await adminAnalytics.getMostSellingDishes({ startDate, endDate, period });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "Most selling products fetched successfully",
            ),
        );
});

exports.addVideos = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res
            .status(400)
            .json(new ApiResponse(400, null, "No files were uploaded"));
    }
    const videoData = req.files.map((video) =>
        videoAddModel.create({
            videoId: uuidV4().toUpperCase(),
            videoUrl: `https://${req.hostname}/upload/${video.filename}`,
            video_local_url: `upload/${video.filename}`,
        }),
    );
    const data = await Promise.all(videoData);
    res.status(200).json(
        new ApiResponse(200, data, "Video uploaded successfully "),
    );
});

exports.deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await videoAddModel.findByIdAndDelete(videoId);
    if (!video) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Video not found"));
    }

    deleteFile(video.video_local_url);

    res.status(200).json(
        new ApiResponse(200, video, "Video deleted successfully"),
    );
});

exports.getAllVideos = asyncHandler(async (req, res) => {
    try {
        const videos = await videoAddModel.find();
        if (videos.length === 0) {
            return res
                .status(404)
                .json(new ApiResponse(404, null, "No videos found"));
        }
        res.status(200).json(
            new ApiResponse(200, videos, "All videos fetched successfully"),
        );
    } catch (error) {
        res.status(500).json(
            new ApiResponse(
                500,
                null,
                "An error occurred while fetching videos",
            ),
        );
    }
});

exports.getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await videoAddModel.findById(videoId);
    if (!video) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Video not found"));
    }
    res.status(200).json(
        new ApiResponse(200, video, "Video fetched successfully"),
    );
});

/* Pin code data  */

exports.addPinCode = asyncHandler(async (req, res) => {
    try {
        const pinCodeData = req.body;

        // Validate required fields
        const { pincode, lng, lat, address } = pinCodeData;
        if (!pincode || !lat || !lng || !address) {
            return res
                .status(400)
                .json(
                    new ApiResponse(
                        400,
                        null,
                        "All fields (pincode, lat, lng, address) are required",
                    ),
                );
        }

        // Check if the pin code already exists
        const existingPinCode = await PinCodeModel.findOne({ pincode });
        if (existingPinCode) {
            return res
                .status(400)
                .json(
                    new ApiResponse(400, null, "Pin code already exists"),
                );
        }

        // Create a new pin code entry
        const newPinCode = await PinCodeModel.create(pinCodeData);

        res.status(201).json(
            new ApiResponse(
                201,
                newPinCode,
                "Pin code added successfully",
            ),
        );
    } catch (error) {
        res.status(500).json(
            new ApiResponse(
                500,
                null,
                "An error occurred while adding the pin code",
            ),
        );
    }
});

exports.getAllPinCodes = asyncHandler(async (req, res) => {
    const data = await PinCodeModel.find({});
    if (data.length == 0) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "No pin codes found"));
    }
    res.status(200).json(
        new ApiResponse(200, data, "All pin codes fetched successfully"),
    );
});

exports.deletePinCode = asyncHandler(async (req, res) => {
    const { id } = req.params; // Extract ID from request parameters

    try {
        const pinCodeData = await PinCodeModel.findByIdAndDelete(id); // Find and delete the pin code by its ID

        if (!pinCodeData) {
            return res
                .status(404)
                .json(new ApiResponse(404, null, "Pin code not found")); // Return 404 if pin code does not exist
        }

        res.status(200).json(
            new ApiResponse(200, pinCodeData, "Pin code deleted successfully"), // Return success response
        );
    } catch (error) {
        res.status(500).json(
            new ApiResponse(500, null, "An error occurred while deleting the pin code"), // Return error response
        );
    }
});

exports.checkPinCodeIdDeliverable = asyncHandler(async (req, res) => {
    const { pinCode } = req.params;
    const pinCodeData = await PinCodeModel.find({ pincode: pinCode });
    console.log(pinCodeData);
    if (pinCodeData.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, false, "Pin code not deliverable"));
    }
    res.status(200).json(new ApiResponse(200, true, "Pin code is deliverable"));
});

exports.uploadImage = asyncHandler(async (req, res) => {
    // console.log(req.file);
    const { filename } = req.file;
    let image_url = `https://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        image_url = `https://${req.hostname}/upload/${filename}`;
    }

    return res
        .status(200)
        .json(new ApiResponse(200, image_url, "Image Uploaded Successfully"));
});

const { notifyCustomer } = require("../services/customerNotification.service");
exports.sendFirebaseNotificationToUser = asyncHandler(async (req, res) => {
    const {
        userIds = [],
        notificationTitle,
        description,
        type = "ADMIN_BROADCAST",
        sendToAll = false,
    } = req.body;

    if (!notificationTitle?.trim() || !description?.trim()) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    null,
                    "notificationTitle and description are required",
                ),
            );
    }

    let users = [];

    if (sendToAll) {
        users = await User.find({
            firebaseToken: { $exists: true, $nin: [null, ""] },
        })
            .select("_id firebaseToken name")
            .lean();
    } else {
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res
                .status(400)
                .json(new ApiResponse(400, null, "userIds is required"));
        }

        if (userIds.length > 1000) {
            return res
                .status(400)
                .json(
                    new ApiResponse(
                        400,
                        null,
                        "Maximum 1000 users can be notified per request",
                    ),
                );
        }

        users = await User.find({ _id: { $in: userIds } })
            .select("_id firebaseToken name")
            .lean();
    }

    if (users.length === 0) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "No users found"));
    }

    let sent = 0;
    let failed = 0;
    let noToken = 0;

    await Promise.all(
        users.map(async (user) => {
            try {
                const result = await notifyCustomer(user._id, {
                    title: notificationTitle.trim(),
                    body: description.trim(),
                    type,
                });

                if (!result.hasToken) {
                    noToken += 1;
                }

                if (result.fcm?.successCount > 0) {
                    sent += 1;
                } else if (result.hasToken) {
                    failed += 1;
                }
            } catch (error) {
                failed += 1;
                console.error(
                    `Admin notification failed for user ${user._id}:`,
                    error.message,
                );
            }
        }),
    );

    const stats = {
        totalUsers: users.length,
        sent,
        failed,
        noToken,
    };

    res.status(200).json(
        new ApiResponse(200, stats, "Notifications processed successfully"),
    );
});
