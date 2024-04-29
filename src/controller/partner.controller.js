const Partner = require("../models/partner.model");
const Hotel = require("../models/hotel.model");
const { responseMessage } = require("../constant");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { generateTokens } = require("../utils/generateToken");
const { deleteFile } = require("../utils/deleteFile");
const { Types } = require("mongoose");

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
    const { email, password } = req.body;

    // Find a user with the provided email in the database
    const user = await Partner.findOne({ email: email });

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
    const { accessToken, refreshToken } = await generateTokens(user._id, 4);

    // Retrieve the logged-in user details excluding password and refreshToken
    const loggedInUser = await Partner.findById(user._id).select(
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

exports.addHotel = asyncHandler(async (req, res) => {
    const { userId, hotelName, address } = req.body;
    const hotel = await Hotel.create({
        userId,
        hotelName,
        address,
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
    const { hotelId, hotelName, address, hotelStatus } = req.body;
    const hotelImage = await Hotel.findByIdAndUpdate(
        hotelId,
        {
            $set: {
                hotelName: hotelName,
                address: address,
                hotelStatus: hotelStatus,
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
    let document_url = `${req.protocol}://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        document_url = `${req.protocol}://${req.hostname}:8000/upload/${filename}`;
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
    let partnerAggregation = [
        {
            $match: {
                _id: new Types.ObjectId(partnerId), // Convert dishId to ObjectId if needed
            },
        },
        {
            $project: { password: 0, refreshToken: 0 }, // Exclude password and refreshToken fields from the result
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

    const partner = await Partner.aggregate(partnerAggregation).exec();
    if (!partner) {
        throw new ApiError(404, responseMessage.userMessage.userNotFound);
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
