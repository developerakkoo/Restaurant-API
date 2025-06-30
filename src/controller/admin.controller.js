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
    const { q, startDate, populate, status } = req.query;
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
        const { deliveryBoys, orderId } = req.body;
        const order = await Order.findById(orderId);
        deliveryBoys.forEach((userId) => {
            getIO().emit(userId, {
                message: "Your message here",
                data: order,
            });
        });
        res.status(200).json(
            new ApiResponse(
                200,
                "ok",
                responseMessage.userMessage.sendOrderPickUpRequestToDeliveryBoys,
            ),
        );
    },
);

exports.getDashboardStats = asyncHandler(async (req, res) => {
    const { sort, startDate, endDate } = req.query;

    let DateFilterPipeline = [];

    // Check if sort, startDate, or endDate are provided
    if (sort || startDate || endDate) {
        const start = startDate
            ? moment(startDate, "DD-MM-YYYY")
            : moment().startOf(sort || "day");
        const end = endDate
            ? moment(endDate, "DD-MM-YYYY")
            : moment().endOf(sort || "day");

        // Validate the parsed dates
        if (!start.isValid() || !end.isValid()) {
            return res
                .status(400)
                .json(
                    new ApiResponse(
                        400,
                        null,
                        "Invalid date format. Please use DD-MM-YYYY.",
                    ),
                );
        }

        // Add date filter to the pipeline
        DateFilterPipeline = [
            {
                $match: {
                    createdAt: {
                        $gte: start.toDate(),
                        $lte: end.toDate(),
                    },
                },
            },
        ];
    }

    const [
        totalOrders,
        totalDeliveredOrders,
        totalCanceledOrders,
        totalUsers,
        totalOnlineUsers,
        totalPartners,
        totalDeliveryBoys,
        totalRevenue,
    ] = await Promise.all([
        Order.countDocuments(DateFilterPipeline[0]?.$match || {}),
        Order.countDocuments({
            ...(DateFilterPipeline[0]?.$match || {}),
            orderStatus: 3,
        }),
        Order.countDocuments({
            ...(DateFilterPipeline[0]?.$match || {}),
            orderStatus: 5, // Corrected to match 'cancel order' status
        }),
        User.countDocuments(DateFilterPipeline[0]?.$match || {}),
        User.countDocuments({
            ...(DateFilterPipeline[0]?.$match || {}),
            isOnline: true,
        }),
        Partner.countDocuments(DateFilterPipeline[0]?.$match || {}),
        DeliveryBoy.countDocuments(DateFilterPipeline[0]?.$match || {}),
        Order.aggregate([
            {
                $match: DateFilterPipeline[0]?.$match || {},
            },
            {
                $group: {
                    _id: null,
                    sum_totalPrice: {
                        $sum: "$priceDetails.totalAmountToPay", // Corrected to match the correct field
                    },
                },
            },
        ]),
    ]);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                totalOrders,
                totalDeliveredOrders,
                totalCanceledOrders,
                totalUsers,
                totalOnlineUsers,
                totalPartners,
                totalDeliveryBoys,
                totalRevenue:
                    totalRevenue.length > 0
                        ? Number(totalRevenue[0].sum_totalPrice.toFixed(2))
                        : 0,
            },
            "Dashboard data fetched successfully",
        ),
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
    const { sort = "month" } = req.query;
    const startDate = moment().startOf(sort); // Today's date at 00:00:00
    const endDate = moment().endOf(sort);
    const pipeline = [
        {
            $project: {
                sortField: {
                    [`$${sort}`]: "$createdAt",
                },
            },
        },
        {
            $group: {
                _id: "$sortField",
                userCount: {
                    $sum: 1,
                },
            },
        },
        {
            $project: {
                _id: 0,
                [sort]: "$_id",
                userCount: 1,
            },
        },
    ];

    const data = await userTrackModel.aggregate(pipeline);
    res.status(200).json(
        new ApiResponse(
            200,
            data,
            responseMessage.userMessage.customerMapChartDataFetchedSuccessfully,
        ),
    );
});


exports.getOrderWithPopulatedFields = asyncHandler(async (req, res) => {
  const pipeline = [
    { $sort: { createdAt: -1 } },

    // User
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

    // Hotel
    {
      $lookup: {
        from: 'hotels',
        localField: 'hotelId',
        foreignField: '_id',
        as: 'hotel',
      },
    },
    { $unwind: { path: '$hotel', preserveNullAndEmptyArrays: true } },

    // Address
    {
      $lookup: {
        from: 'useraddresses',
        localField: 'address',
        foreignField: '_id',
        as: 'userAddress',
      },
    },
    { $unwind: { path: '$userAddress', preserveNullAndEmptyArrays: true } },

    // Promo Code
    {
      $lookup: {
        from: 'promocodes',
        localField: 'promoCode',
        foreignField: '_id',
        as: 'promoCodeDetails',
      },
    },
    { $unwind: { path: '$promoCodeDetails', preserveNullAndEmptyArrays: true } },

    // Delivery Boy
    {
      $lookup: {
        from: 'deliveryboys',
        localField: 'assignedDeliveryBoy',
        foreignField: '_id',
        as: 'deliveryBoy',
      },
    },
    { $unwind: { path: '$deliveryBoy', preserveNullAndEmptyArrays: true } },

    // Products (dishes)
    {
      $lookup: {
        from: 'hoteldishes',
        localField: 'products.dishId',
        foreignField: '_id',
        as: 'productDetails',
        pipeline: [
          {
            $lookup: {
              from: 'categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'categoryDetails',
            },
          },
          { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
        ],
      },
    },
  ];

  const orders = await Order.aggregate(pipeline);
  res.status(200).json({
    success: true,
    data: orders,
  });
});

exports.orderChartData = asyncHandler(async (req, res) => {
    let { sort = "day", startDate, endDate } = req.query;

  // Default range if not provided
  if (!startDate || !endDate) {
    if (sort === "day") {
      startDate = moment().startOf("month").format("YYYY-MM-DD");
      endDate = moment().endOf("month").format("YYYY-MM-DD");
    } else if (sort === "month") {
      startDate = moment().startOf("year").format("YYYY-MM-DD");
      endDate = moment().endOf("year").format("YYYY-MM-DD");
    } else if (sort === "year") {
      startDate = moment().subtract(5, "years").startOf("year").format("YYYY-MM-DD");
      endDate = moment().endOf("year").format("YYYY-MM-DD");
    }
  }

  const start = moment(startDate, "YYYY-MM-DD").startOf("day");
  const end = moment(endDate, "YYYY-MM-DD").endOf("day");

  if (!start.isValid() || !end.isValid()) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid date format. Use YYYY-MM-DD."));
  }

  if (end.isBefore(start)) {
    return res.status(400).json(new ApiResponse(400, null, "End date must be after start date."));
  }

  // Dynamic group stage
  const groupId = {
    year: { $year: "$createdAt" }
  };

  if (sort === "month") {
    groupId.month = { $month: "$createdAt" };
  } else if (sort === "day") {
    groupId.month = { $month: "$createdAt" };
    groupId.day = { $dayOfMonth: "$createdAt" };
  }

  const pipeline = [
    {
      $match: {
        createdAt: {
          $gte: start.toDate(),
          $lte: end.toDate()
        }
      }
    },
    {
      $group: {
        _id: groupId,
        orderCount: { $sum: 1 }
      }
    },
    {
      $sort: {
        "_id.year": 1,
        ...(sort !== "year" && { "_id.month": 1 }),
        ...(sort === "day" && { "_id.day": 1 })
      }
    }
  ];

  const result = await Order.aggregate(pipeline);

  const labels = result.map((item) => {
    if (sort === "day") {
      return moment(`${item._id.year}-${item._id.month}-${item._id.day}`, "YYYY-M-D").format("DD MMM");
    } else if (sort === "month") {
      return moment(`${item._id.year}-${item._id.month}`, "YYYY-M").format("MMMM");
    } else if (sort === "year") {
      return `${item._id.year}`;
    }
  });

  const data = result.map((item) => item.orderCount);

  return res.status(200).json(
    new ApiResponse(200, { labels, data }, "Order chart data fetched successfully")
  );
});

exports.totalRevenueData = asyncHandler(async (req, res) => {
    const { sort = "dayOfMonth" } = req.query;

    const pipeline = [
        {
            $project: {
                totalPrice: "$priceDetails.totalAmountToPay",
                sortField: {
                    [`$${sort}`]: "$createdAt",
                },
            },
        },
        {
            $group: {
                _id: "$sortField",
                revenue: {
                    $sum: "$totalPrice",
                },
            },
        },
        {
            $project: {
                _id: 0,
                [sort]: "$_id",
                revenue: 1,
            },
        },
    ];

    const result = await Order.aggregate(pipeline);
    const label = result.map((item) => {
        if (item.dayOfMonth) {
            return moment().date(item.dayOfMonth).format("dddd");
        }
        if (item.week) {
            return item.week;
        }
        if (item.month) {
            return moment().month(item.month).format("MMMM");
        }
        if (item.year) {
            return item.year;
        }
    });
    const data = result.map((item) => item.revenue);

    res.status(200).json(
        new ApiResponse(
            200,
            { label, data },
            responseMessage.userMessage.revenueChartData,
        ),
    );
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
    const { period = "monthly" } = req.query; // period can be 'daily', 'weekly', or 'monthly'

    // Define the date range based on the period
    let startDate, endDate;
    if (period === "daily") {
        startDate = moment().startOf("day").toDate();
        endDate = moment().endOf("day").toDate();
    } else if (period === "weekly") {
        startDate = moment().startOf("week").toDate();
        endDate = moment().endOf("week").toDate();
    } else if (period === "monthly") {
        startDate = moment().startOf("month").toDate();
        endDate = moment().endOf("month").toDate();
    } else {
        return res
            .status(400)
            .json(new ApiResponse(400, null, "Invalid period"));
    }

    const matchStage = {
        createdAt: {
            $gte: startDate,
            $lte: endDate,
        },
    };

    const aggregatePipeline = [
        { $match: matchStage },
        { $unwind: "$products" },
        {
            $group: {
                _id: "$products.dishId",
                totalOrders: { $sum: "$products.quantity" },
            },
        },
        {
            $lookup: {
                from: "hoteldishes", // Assuming the collection name is "hoteldishes"
                localField: "_id",
                foreignField: "_id",
                as: "dish",
            },
        },
        { $unwind: "$dish" },
        {
            $lookup: {
                from: "dishstars", // Assuming the collection name is "dishstars"
                localField: "_id",
                foreignField: "dishId",
                as: "ratings",
            },
        },
        {
            $addFields: {
                averageRating: { $avg: "$ratings.star" },
            },
        },
        {
            $project: {
                _id: 0,
                dish: 1,
                totalOrders: 1,
                averageRating: 1,
            },
        },
        { $sort: { totalOrders: -1 } },
        { $limit: 10 }, // Limit to top 10 products
    ];

    const result = await Order.aggregate(aggregatePipeline).exec();

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

const { sendFirebaseNotification } = require("../utils/firebaseNotifier.utils");
const { log } = require("winston");
exports.sendFirebaseNotificationToUser = asyncHandler(async (req, res) => {
    const { userIds, notificationTitle, description } = req.body;

    // Find users with the given user IDs
    const users = await User.find({ _id: { $in: userIds } }).lean();

    if (users.length === 0) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "No users found"));
    }

    // Extract and filter valid Firebase tokens
    const userFirebaseTokens = users
        .map((user) => user.firebaseToken) // Extract firebaseToken
        .filter((token) => token !== null && token !== undefined); // Filter out invalid tokens
    if (userFirebaseTokens.length === 0) {
        return res
            .status(404)
            .json(new ApiResponse(404, "No valid Firebase tokens found..."));
    }
    const data = await sendFirebaseNotification(
        userFirebaseTokens,
        notificationTitle,
        description,
    );
    res.status(200).json(new ApiResponse(200, data, "User Firebase Token"));
});
