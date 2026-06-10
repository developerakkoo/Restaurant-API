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
const { getIO } = require("../utils/socket");
const { setDriverOffline } = require("../utils/driverStatus.util");
const {
    REQUIRED_VERIFICATION_DOC_TYPES,
    UPLOAD_ALLOWED_VERIFICATION_STATUSES,
    MAX_VERIFICATION_SUBMITS_PER_HOUR,
} = require("../constants/driverVerification.constants");

const ALLOWED_DOC_MIMES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
];

const buildPublicUploadUrl = (req, filename) =>
    `https://${req.hostname}/upload/${filename}`;

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

    // Block login for admin-blocked or permanently rejected drivers
    if (user.status === 1) {
        return res.status(403).json(
            new ApiResponse(
                403,
                {
                    isRegistered: true,
                    status: user.status,
                    verificationStatus: user.verificationStatus || "not_submitted",
                    rejectionReason:
                        user.rejectionReason ||
                        "Your account has been blocked by admin.",
                },
                "Your account has been blocked by admin.",
            ),
        );
    }

    if (user.verificationStatus === "permanently_rejected" || user.status === 3) {
        return res.status(403).json(
            new ApiResponse(
                403,
                {
                    isRegistered: true,
                    status: user.status,
                    verificationStatus: "permanently_rejected",
                    rejectionReason:
                        user.rejectionReason ||
                        "Your application has been permanently rejected.",
                    rejectionType: user.rejectionType || "permanent",
                },
                user.rejectionReason ||
                    "Your application has been permanently rejected.",
            ),
        );
    }

    // Generate access and refresh tokens for the logged-in user
    const { accessToken, refreshToken } = await generateTokens(user._id, 3);

    await DeliverBoy.findByIdAndUpdate(user._id, {
        $set: { isOnline: false, lastSeen: new Date() },
    });

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
                    verificationStatus:
                        user.verificationStatus || "not_submitted",
                    rejectionReason: user.rejectionReason || null,
                    rejectionType: user.rejectionType || null,
                    isRegistered: true,
                    accessToken,
                    refreshToken,
                },
                responseMessage.userMessage.loginSuccessful,
            ),
        );
});

exports.logoutDeliveryBoy = asyncHandler(async (req, res) => {
    const userId = req.body.userId || req.user?.userId;

    if (!userId) {
        return res.status(400).json(
            new ApiResponse(400, null, "Delivery boy ID is required")
        );
    }

    const io = getIO();
    await setDriverOffline(userId, io);

    await DeliverBoy.findByIdAndUpdate(
        userId,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(200, null, responseMessage.userMessage.logoutSuccessful)
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
    const authUserId = req.user?.userId?.toString();
    const requestedUserId = userId?.toString();

    if (!authUserId || authUserId !== requestedUserId) {
        throw new ApiError(403, "You can only upload documents for your own account.");
    }

    if (!req.file) {
        throw new ApiError(400, "Document file is required.");
    }

    const parsedDocType = Number(documentType);
    if (!REQUIRED_VERIFICATION_DOC_TYPES.includes(parsedDocType)) {
        deleteFile(`upload/${req.file.filename}`);
        throw new ApiError(
            400,
            "Invalid document type. Allowed: Aadhar, PAN, Driving License.",
        );
    }

    if (
        req.file.mimetype &&
        !ALLOWED_DOC_MIMES.includes(req.file.mimetype.toLowerCase())
    ) {
        deleteFile(`upload/${req.file.filename}`);
        throw new ApiError(
            400,
            "Invalid file type. Allowed: JPEG, PNG, WebP, PDF.",
        );
    }

    const driver = await DeliverBoy.findById(userId);
    if (!driver) {
        deleteFile(`upload/${req.file.filename}`);
        throw new ApiError(404, responseMessage.userMessage.deliveryBoyNotFound);
    }

    if (
        !UPLOAD_ALLOWED_VERIFICATION_STATUSES.includes(driver.verificationStatus)
    ) {
        deleteFile(`upload/${req.file.filename}`);
        throw new ApiError(
            403,
            "Document upload is not allowed in your current verification state.",
        );
    }

    const { filename, mimetype, originalname } = req.file;
    const local_filePath = `upload/${filename}`;
    const document_url = buildPublicUploadUrl(req, filename);

    let userDocument;
    const existDoc = await DeliverBoyDocument.findOne({
        userId,
        documentType: parsedDocType,
    });
    if (existDoc) {
        deleteFile(existDoc.local_filePath);
        userDocument = await DeliverBoyDocument.findByIdAndUpdate(
            existDoc._id,
            {
                documentType: parsedDocType,
                documentNumber,
                document_url,
                local_filePath,
                documentStatus: 0,
                mimeType: mimetype || null,
                originalFileName: originalname || null,
            },
            { new: true },
        );
    } else {
        userDocument = await DeliverBoyDocument.create({
            userId,
            documentType: parsedDocType,
            documentNumber,
            document_url,
            local_filePath,
            documentStatus: 0,
            mimeType: mimetype || null,
            originalFileName: originalname || null,
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
    const { userId, deliveryBoyId } = req.body;
    const {
        firstName,
        lastName,
        email,
        phoneNumber,
        address,
        city,
        bloodGroup,
        dateOfBirth,
        isOnline,
    } = req.body;

    // Use userId from body or params, or from query
    const idToUpdate = userId || deliveryBoyId || req.query.userId;
    
    if (!idToUpdate) {
        return res
            .status(400)
            .json(new ApiResponse(400, null, "Delivery Boy ID is required"));
    }

    if (!Types.ObjectId.isValid(idToUpdate)) {
        return res
            .status(400)
            .json(new ApiResponse(400, null, "Invalid Delivery Boy ID format"));
    }

    // Build update object with only provided fields
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (isOnline !== undefined) updateData.isOnline = isOnline;

    // Check if phone number is being updated and if it's already taken
    if (phoneNumber) {
        const existingUser = await DeliverBoy.findOne({ 
            phoneNumber,
            _id: { $ne: new Types.ObjectId(idToUpdate) }
        });
        if (existingUser) {
            return res
                .status(409)
                .json(new ApiResponse(409, null, "Phone number already exists"));
        }
    }

    const deliveryBoy = await DeliverBoy.findByIdAndUpdate(
        idToUpdate,
        { $set: updateData },
        { new: true, runValidators: true }
    ).select("-refreshToken -password");

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

exports.getVerificationStatus = asyncHandler(async (req, res) => {
    const userId = req.query.userId || req.user?.userId;
    const authUserId = req.user?.userId?.toString();

    if (!userId) {
        throw new ApiError(400, "User ID is required.");
    }

    if (authUserId && authUserId !== userId.toString()) {
        throw new ApiError(403, "Access denied.");
    }

    const driver = await DeliverBoy.findById(userId).select(
        "status verificationStatus rejectionReason rejectionType documentsSubmittedAt verifiedAt rejectedAt",
    );

    if (!driver) {
        throw new ApiError(404, responseMessage.userMessage.deliveryBoyNotFound);
    }

    const documents = await DeliverBoyDocument.find({
        userId,
        documentType: { $in: REQUIRED_VERIFICATION_DOC_TYPES },
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                status: driver.status,
                verificationStatus: driver.verificationStatus,
                rejectionReason: driver.rejectionReason,
                rejectionType: driver.rejectionType,
                documentsSubmittedAt: driver.documentsSubmittedAt,
                verifiedAt: driver.verifiedAt,
                rejectedAt: driver.rejectedAt,
                documents,
                requiredDocumentTypes: REQUIRED_VERIFICATION_DOC_TYPES,
            },
            "Verification status fetched successfully.",
        ),
    );
});

exports.submitVerification = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const authUserId = req.user?.userId?.toString();

    if (!userId || !authUserId || authUserId !== userId.toString()) {
        throw new ApiError(403, "You can only submit verification for your own account.");
    }

    const driver = await DeliverBoy.findById(userId);
    if (!driver) {
        throw new ApiError(404, responseMessage.userMessage.deliveryBoyNotFound);
    }

    if (
        !UPLOAD_ALLOWED_VERIFICATION_STATUSES.includes(driver.verificationStatus)
    ) {
        throw new ApiError(
            403,
            "Verification cannot be submitted in your current state.",
        );
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (
        driver.lastVerificationSubmitAt &&
        driver.lastVerificationSubmitAt > oneHourAgo &&
        (driver.verificationSubmitCount || 0) >= MAX_VERIFICATION_SUBMITS_PER_HOUR
    ) {
        throw new ApiError(
            429,
            "Too many verification submissions. Please try again later.",
        );
    }

    const documents = await DeliverBoyDocument.find({
        userId,
        documentType: { $in: REQUIRED_VERIFICATION_DOC_TYPES },
    });

    const uploadedTypes = documents.map((doc) => doc.documentType);
    const missingTypes = REQUIRED_VERIFICATION_DOC_TYPES.filter(
        (type) => !uploadedTypes.includes(type),
    );

    if (missingTypes.length > 0) {
        throw new ApiError(
            400,
            "Please upload all required documents before submitting.",
        );
    }

    const submitCount =
        driver.lastVerificationSubmitAt &&
        driver.lastVerificationSubmitAt > oneHourAgo
            ? (driver.verificationSubmitCount || 0) + 1
            : 1;

    const updatedDriver = await DeliverBoy.findByIdAndUpdate(
        userId,
        {
            $set: {
                verificationStatus: "pending_review",
                documentsSubmittedAt: new Date(),
                status: 0,
                rejectionReason: null,
                rejectionType: null,
                rejectedAt: null,
                rejectedBy: null,
                lastVerificationSubmitAt: new Date(),
                verificationSubmitCount: submitCount,
            },
        },
        { new: true },
    );

    await DeliverBoyDocument.updateMany(
        { userId, documentType: { $in: REQUIRED_VERIFICATION_DOC_TYPES } },
        { $set: { documentStatus: 0 } },
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                verificationStatus: updatedDriver.verificationStatus,
                documentsSubmittedAt: updatedDriver.documentsSubmittedAt,
            },
            "Verification submitted successfully. Admin will review your documents.",
        ),
    );
});

