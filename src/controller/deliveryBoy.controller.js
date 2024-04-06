const DeliverBoy = require("../models/deliveryBoy.model");
const DeliverBoyDocument = require("../models/userDocument.model");
const { responseMessage } = require("../constant");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { generateTokens } = require("../utils/generateToken");
const { deleteFile } = require("../utils/deleteFile");

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
    const { name, email, phoneNumber, password } = req.body;
    const existedUser = await DeliverBoy.findOne({
        $or: [{ email }, { phoneNumber }],
    });
    if (existedUser) {
        throw new ApiError(409, responseMessage.userMessage.userExist);
    }
    const user = await DeliverBoy.create({
        name,
        email,
        phoneNumber,
        password,
    });
    const createdUser = await DeliverBoy.findById(user._id).select(
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
    const { email, password } = req.body;

    // Find a user with the provided email in the database
    const user = await DeliverBoy.findOne({ email: email });

    // If the user is not found, return a 404 response
    if (!user) {
        throw new ApiError(404, responseMessage.userMessage.userNotFound);
    }

    // Check if the provided password is correct
    const isPasswordValid = await user.isPasswordCorrect(password);

    // If the password is incorrect, return a 401 response
    if (!isPasswordValid) {
        throw new ApiError(401, responseMessage.userMessage.incorrectPassword);
    }

    // Generate access and refresh tokens for the logged-in user
    const { accessToken, refreshToken } = await generateTokens(user._id, 3);

    // Retrieve the logged-in user details excluding password and refreshToken
    const loggedInUser = await DeliverBoy.findById(user._id).select(
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

exports.uploadProfileImage = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    // console.log(req.file);
    const { filename } = req.file;
    const local_filePath = `upload/${filename}`;
    let document_url = `${req.protocol}://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        document_url = `${req.protocol}://${req.hostname}:8000/upload/${filename}`;
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
    if (!documentToDelete || documentToDelete.local_profileImagePath === '_' ) {
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
    let document_url = `${req.protocol}://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        document_url = `${req.protocol}://${req.hostname}:8000/upload/${filename}`;
    }
    const userDocument = await DeliverBoyDocument.create({
        userId,
        documentType,
        documentNumber,
        document_url,
        local_filePath,
    });
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
