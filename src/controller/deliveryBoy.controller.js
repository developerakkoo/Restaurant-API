const DeliverBoyDocument = require("../models/userDocument.model");
const Order = require("../models/order.model");
const DeliverBoy = require("../models/deliveryBoy.model");
const leaveModel = require("../models/deliveryBoyLeave.model");
const { responseMessage, cookieOptions } = require("../constant");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { generateTokens } = require("../utils/generateToken");
const { deleteFile } = require("../utils/deleteFile");
const moment = require("moment");
const { Types } = require("mongoose");

/**
 *  @function registerDeliveryBoy
 * @async
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @throws {ApiError} Throws an ApiError if validation or registration fails
 *  @description This asynchronous function handles the registration of an  user.
 * It extracts email and password from the request body, validates the fields, checks for existing user,
 * creates a new user, and returns the registered user details in the response.
 */
exports.registerDeliveryBoy = asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        fatherName,
        dateOfBirth,
        bloodGroup,
        city,
        address,
        languageKnown,
        phoneNumber,
        password,
    } = req.body;
    const existedUser = await DeliverBoy.findOne({ phoneNumber });
    if (existedUser) {
        throw new ApiError(409, responseMessage.userMessage.userExist);
    }
    const user = await DeliverBoy.create({
        firstName,
        lastName,
        fatherName,
        dateOfBirth,
        bloodGroup,
        email,
        city,
        address,
        languageKnown,
        phoneNumber,
        password,
    });
    const createdUser = await DeliverBoy.findById(user._id).select(
        "-refreshToken",
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
 *  @function loginDeliveryBoy
 * @async
 * @param {import("express").Request} req - Express request object
 *  @param {import("express").Response} res - Express response object
 * @throws {ApiError} Throws an ApiError if validation or login fails
 *  @description  * @description This asynchronous function handles user login. It validates the provided email and password,
 * generates access and refresh tokens upon successful login, sets cookies with the tokens, and sends a response
 * indicating the login status along with the user details (excluding password and refreshToken).
 */
exports.loginDeliveryBoy = asyncHandler(async (req, res) => {
    // Extract user login details from the request body
    const { phoneNumber } = req.body;

    // Find a user with the provided email in the database
    const user = await DeliverBoy.findOne({ phoneNumber });

    // If the user is not found, return a 404 response
    if (!user) {
        return res
            .status(404)
            .json(
                new ApiResponse(
                    404,
                    { isRegistered: false },
                    responseMessage.userMessage.userNotFound,
                ),
            );
    }

    // Check if the provided password is correct
    // const isPasswordValid = await user.isPasswordCorrect(password);

    // If the password is incorrect, return a 401 response
    // if (!isPasswordValid) {
    //     throw new ApiError(401, responseMessage.userMessage.incorrectPassword);
    // }

    // Generate access and refresh tokens for the logged-in user
    const { accessToken, refreshToken } = await generateTokens(user._id, 3);

    // Retrieve the logged-in user details excluding password and refreshToken
    const loggedInUser = await DeliverBoy.findById(user._id).select(
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
                    status: user.status,
                    isRegistered: true,
                    accessToken,
                    refreshToken,
                },
                responseMessage.userMessage.loginSuccessful,
            ),
        );
});

exports.uploadProfileImage = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    // console.log(req.file);
    const { filename } = req.file;
    const local_filePath = `upload/${filename}`;
    let document_url = `https://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        document_url = `https://${req.hostname}/upload/${filename}`;
    }
    const userDocument = await DeliverBoy.findByIdAndUpdate(
        userId,
        {
            $set: {
                profile_image: document_url,
                local_profileImagePath: local_filePath,
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
                userDocument,
                responseMessage.userMessage.profileImageUploadedSuccessfully,
            ),
        );
});

exports.deletedImage = asyncHandler(async (req, res) => {
    const { userId } = req.query;
    // console.log(req.query);
    const documentToDelete = await DeliverBoy.findOne({
        _id: userId,
    });
    // console.log(documentToDelete);
    if (!documentToDelete || documentToDelete.local_profileImagePath === "_") {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    "",
                    responseMessage.userMessage.documentNotFound,
                ),
            );
    }
    deleteFile(documentToDelete.local_profileImagePath);
    await DeliverBoy.findByIdAndUpdate(
        userId,
        {
            $unset: {
                profile_image: 1,
                local_profileImagePath: 1,
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
                "",
                responseMessage.userMessage.documentDeletedSuccessfully,
            ),
        );
});

exports.uploadDocument = asyncHandler(async (req, res) => {
    const { userId, documentType, documentNumber } = req.body;
    // console.log(req.file);
    const { filename } = req.file;
    const local_filePath = `upload/${filename}`;
    let document_url = `https://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        document_url = `https://${req.hostname}/upload/${filename}`;
    }

    let userDocument;
    const existDoc = await DeliverBoyDocument.findOne({ userId, documentType });
    if (existDoc) {
        deleteFile(existDoc.local_filePath);
        userDocument = await DeliverBoyDocument.findByIdAndUpdate(
            existDoc._id,
            {
                documentType,
                documentNumber,
                document_url,
                local_filePath,
            },
            { new: true },
        );
    } else {
        userDocument = await DeliverBoyDocument.create({
            userId,
            documentType,
            documentNumber,
            document_url,
            local_filePath,
        });
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userDocument,
                responseMessage.userMessage.documentUploadedSuccessfully,
            ),
        );
});

exports.deletedDocument = asyncHandler(async (req, res) => {
    const { documentId } = req.query;
    const documentToDelete = await DeliverBoyDocument.findOne({
        _id: documentId,
        userId: req.user.userId,
    });
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

exports.getAllDocumentsByUserId = asyncHandler(async (req, res) => {
    const { userId } = req.query;
    const userDocuments = await DeliverBoyDocument.find({ userId: userId });
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userDocuments,
                responseMessage.userMessage.documentsFetchedSuccessfully,
            ),
        );
});

exports.getDocumentById = asyncHandler(async (req, res) => {
    const { documentId } = req.query;
    const userDocument = await DeliverBoyDocument.findById(documentId);
    if (!userDocument) {
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
                userDocument,
                responseMessage.userMessage.documentsFetchedSuccessfully,
            ),
        );
});

exports.getAllDocuments = asyncHandler(async (req, res) => {
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;
    const dataCount = await DeliverBoyDocument.countDocuments();
    const userDocuments = await DeliverBoyDocument.find()
        .skip(skip)
        .limit(pageSize);
    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + userDocuments.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                content: userDocuments,
                startItem,
                endItem,
                currentPage: pageNumber,
                totalPages,
                pagesize: userDocuments.length,
                totalDoc: dataCount,
            },
            responseMessage.userMessage.documentsFetchedSuccessfully,
        ),
    );
});

exports.getMyProfile = asyncHandler(async (req, res) => {
    const { userId } = req.query;
    const user = await DeliverBoy.aggregate([
        {
            $match: {
                _id: new Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                as: "userdocuments",
                from: "userdocuments",
                foreignField: "userId",
                localField: "_id",
            },
        },
    ]);
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
                responseMessage.userMessage.profileFetchedSuccessfully,
            ),
        );
});

exports.askForLeave = asyncHandler(async (req, res) => {
    const { deliveryBoyId, reason, startDate, endDate } = req.body;
    const leaveRequest = await leaveModel.findOne({
        deliveryBoyId,
        reason,
        startDate,
        endDate,
    });
    if (leaveRequest) {
        return res
            .status(400)
            .json(new ApiResponse(400, null, "Leave Request Already Exists"));
    }
    const newLeaveRequest = await leaveModel.create({
        deliveryBoyId,
        reason,
        startDate,
        endDate,
    });
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                newLeaveRequest,
                "Leave Request Sent Successfully",
            ),
        );
});

exports.getAllLeaveRequests = asyncHandler(async (req, res) => {
    const { deliveryBoyId, status } = req.query;
    const dbQuery = { deliveryBoyId };
    if (status) dbQuery.status = status;

    const leaveRequests = await leaveModel.find(dbQuery);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                leaveRequests,
                "Leave Requests Fetched Successfully",
            ),
        );
});

exports.updateLeaveRequestStatus = asyncHandler(async (req, res) => {
    const { leaveRequestId, status } = req.body;
    const leaveRequest = await leaveModel.findByIdAndUpdate(
        leaveRequestId,
        { status },
        { new: true },
    );
    if (!leaveRequest) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Leave Request Not Found"));
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                leaveRequest,
                "Leave Request Status Updated Successfully",
            ),
        );
});

exports.getLeaveRequestById = asyncHandler(async (req, res) => {
    const { leaveRequestId } = req.query;
    const leaveRequest = await leaveModel.findById(leaveRequestId);
    if (!leaveRequest) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Leave Request Not Found"));
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                leaveRequest,
                "Leave Request Fetched Successfully",
            ),
        );
});

exports.getEarnings = asyncHandler(async (req, res) => {
    const deliveryBoyId = req.params.deliveryBoyId;

    if (!deliveryBoyId) {
        return res.status(400).json({
            message: "Delivery boy ID is required",
        });
    }

    // Start of the month and end of the month for current month calculations
    const startOfMonth = moment().startOf("month").toDate();
    const endOfMonth = moment().endOf("month").toDate();

    // Define all the queries
    const queries = [
        // Total Earnings
        Order.aggregate([
            {
                $match: {
                    assignedDeliveryBoy: new Types.ObjectId(deliveryBoyId),
                },
            },
            {
                $group: {
                    _id: null,
                    totalEarnings: {
                        $sum: "$priceDetails.deliveryBoyCompensation",
                    },
                },
            },
        ]).exec(),

        // Total Deliveries
        Order.countDocuments({
            assignedDeliveryBoy: new Types.ObjectId(deliveryBoyId),
        }).exec(),

        // Current Month's Total Deliveries and Earnings
        Order.aggregate([
            {
                $match: {
                    assignedDeliveryBoy: new Types.ObjectId(deliveryBoyId),
                    createdAt: { $gte: startOfMonth, $lt: endOfMonth },
                },
            },
            {
                $group: {
                    _id: null,
                    totalEarnings: {
                        $sum: "$priceDetails.deliveryBoyCompensation",
                    },
                    totalDeliveries: { $count: {} },
                },
            },
        ]).exec(),

        // Daily Earnings List with Order Count
        Order.aggregate([
            {
                $match: {
                    assignedDeliveryBoy: new Types.ObjectId(deliveryBoyId),
                    createdAt: { $gte: startOfMonth, $lt: endOfMonth },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                        },
                    },
                    dailyEarnings: {
                        $sum: "$priceDetails.deliveryBoyCompensation",
                    },
                    totalOrders: { $count: {} },
                },
            },
            { $sort: { _id: 1 } },
        ]).exec(),
    ];

    try {
        // Run all queries in parallel
        const [
            totalEarningsResult,
            totalDeliveries,
            currentMonthResult,
            dailyEarnings,
        ] = await Promise.all(queries);

        const totalEarnings = totalEarningsResult[0]
            ? totalEarningsResult[0].totalEarnings
            : 0;

        const currentMonthData = currentMonthResult[0]
            ? currentMonthResult[0]
            : { totalEarnings: 0, totalDeliveries: 0 };

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    totalEarnings,
                    totalDeliveries,
                    currentMonthData,
                    dailyEarnings,
                },
                "Earnings Fetched Successfully",
            ),
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

exports.updateDeliveryBoy = asyncHandler(async (req, res) => {
    const { deliveryBoyId, isOnline } = req.params;
    const deliveryBoy = await DeliverBoy.findByIdAndUpdate(
        deliveryBoyId,
        isOnline,
        { new: true },
    );
    if (!deliveryBoy) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Delivery Boy Not Found"));
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deliveryBoy,
                "Delivery Boy Updated Successfully",
            ),
        );
});

exports.deleteDriverData = asyncHandler(async (req, res) => {
    const { deliveryBoyId } = req.params;
    await DeliverBoy.findByIdAndDelete(deliveryBoyId);
    await DeliverBoyDocument.findByIdAndUpdate(deliveryBoyId);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Delivery Boy Data Deleted Successfully",
            ),
        );
});

exports.updateDeliveredOrders = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const deliveryBoyId = req.params.userid;

    // Find the delivery boy
    const deliveryBoy = await DeliverBoy.findById(deliveryBoyId);

    if (!deliveryBoy) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Delivery Boy Not Found"));
    }

    // Check if order exists
    const order = await Order.findById(orderId);
    if (!order) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Order Not Found"));
    }

    // Add order to delivered orders array if not already present
    if (!deliveryBoy.deliveredOrders.includes(orderId)) {
        deliveryBoy.deliveredOrders.push(orderId);
        await deliveryBoy.save();
    }

    let io = getIO();
    io.emit("order- delivered", {
        order,
        deliveryBoyId,
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deliveryBoy,
                "Delivered Orders Updated Successfully"
            ),
        );
});

