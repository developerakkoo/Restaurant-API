const Admin = require("../models/admin.model");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { generateTokens } = require("../utils/generateToken");
const DeliveryBoy = require("../models/deliveryBoy.model");
const DeliverBoyDocument = require("../models/userDocument.model");
const userAddress = require("../models/userAddress.model");
const Hotel = require("../models/hotel.model");
const HotelDish = require("../models/hotelDish.model");
const Category = require("../models/category.model");
const Partner = require("../models/partner.model");
const User = require("../models/user.model");
const { responseMessage } = require("../constant");
const { deleteFile } = require("../utils/deleteFile");
const moment = require("moment");

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

    // Set options for HTTP cookies
    const options = {
        httpOnly: true,
        secure: true,
    };

    // Send a successful login response with cookies containing access and refresh tokens
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
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

    //sort by status
    if (status) {
        dbQuery.status = status;
    }

    const dataCount = await User.countDocuments(dbQuery);

    let usersAggregation = [
        {
            $match: dbQuery,
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
    if (populate && populate.toLowerCase() === "true") {
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
        dbQuery.status = status;
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
            $limit: pageSize,
        },
    ];
    if (populate && populate.toLowerCase() === "true") {
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

    const users = await Partner.aggregate(hotelAggregation).exec();
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
        dbQuery.status = status;
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

    let hotelAggregation = [
        {
            $match: dbQuery,
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
    if (populate && populate.toLowerCase() === "true") {
        hotelAggregation.splice(1, 0, {
            // Insert $lookup stage after $match
            $lookup: {
                as: "userDocuments",
                from: "userdocuments",
                foreignField: "userId",
                localField: "_id",
            },
        });
    }
    const deliveryBoys = await DeliveryBoy.aggregate(hotelAggregation).exec();

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
    const { documentId } = req.query;
    const documentToDelete = await DeliverBoyDocument.findById(documentId);
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
    const { hotelId, status } = req.body;
    const hotel = await Hotel.findByIdAndUpdate(
        hotelId,
        {
            $set: {
                hotelStatus: status,
            },
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

exports.getAllHotel = asyncHandler(async (req, res) => {
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
                { hotelName: { $regex: `^${q}`, $options: "i" } },
                { hotelName: { $regex: `^${q}` } },
            ],
        };
    }

    // Sort by status
    if (status) {
        dbQuery.status = status;
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

    const dataCount = await Hotel.countDocuments(dbQuery);

    let hotelAggregation = [
        {
            $match: dbQuery,
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
    if (populate && populate.toLowerCase() === "true") {
        // Add a lookup stage to fetch hotel owner details
        hotelAggregation.splice(
            1,
            0,
            {
                $lookup: {
                    as: "hotelOwner",
                    from: "partners",
                    foreignField: "_id",
                    localField: "userId",
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
            // Add a lookup stage to fetch hotel stars data
            {
                $lookup: {
                    as: "hotelstars",
                    from: "hotelstars",
                    foreignField: "hotelId",
                    localField: "_id",
                    //adding a pipeline for getting user who start the hotel
                    pipeline: [
                        {
                            $lookup: {
                                as: "user",
                                from: "users",
                                foreignField: "_id",
                                localField: "userId",
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
                        // Unwind the user array to work with individual user object
                        {
                            $unwind: "$user",
                        },
                    ],
                },
            },
            // Unwind the hotelstars array to work with individual star ratings
            {
                $unwind: "$hotelstars",
            },
            // Group by hotel details and calculate star counts
            {
                $group: {
                    _id: {
                        hotelId: "$_id",
                        hotelName: "$hotelName",
                        image_url: "$image_url",
                        address: "$address",
                        hotelOwner: "$hotelOwner",
                    },
                    // Count the total number of stars for each hotel
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
                    // Similar counts for other star ratings
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
                    // Push each star data into an array
                    starData: { $push: "$hotelstars" },
                },
            },
            // Unwind the hotelOwner array to flatten it
            {
                $unwind: "$_id.hotelOwner",
            },
            // Project the final result with necessary fields
            {
                $project: {
                    _id: 0,
                    hotelId: "$_id.hotelId",
                    hotelName: "$_id.hotelName",
                    image_url: "$_id.image_url",
                    address: "$_id.address",
                    // Structure star counts
                    starCounts: {
                        "1starCount": "$1starCount",
                        "2starCount": "$2starCount",
                        "3starCount": "$3starCount",
                        "4starCount": "$4starCount",
                        "5starCount": "$5starCount",
                        totalCount: "$totalCount",
                    },
                    // Include the array of star data
                    ratingData: "$starData",
                    // Flatten the partner/hotelOwner array
                    partner: "$_id.hotelOwner",
                },
            },
        );
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
    let document_url = `${req.protocol}://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        document_url = `${req.protocol}://${req.hostname}:8000/upload/${filename}`;
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
