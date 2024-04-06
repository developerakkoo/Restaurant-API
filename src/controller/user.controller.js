const User = require("../models/user.model");
const userAddress = require("../models/userAddress.model");
const { responseMessage } = require("../constant");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { generateTokens } = require("../utils/generateToken");
const { deleteFile } = require("../utils/deleteFile");


/**
 *  @function registerUser
 * @async
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @throws {ApiError} Throws an ApiError if validation or registration fails
 *  @description This asynchronous function handles the registration of an  user.
 * It extracts email and password from the request body, validates the fields, checks for existing user,
 * creates a new user, and returns the registered user details in the response.
 */
exports.registerUser = asyncHandler(async (req, res) => {
    const { name, email, phoneNumber, password } = req.body;
    const existedUser = await User.findOne({
        $or: [{ email }, { phoneNumber }],
    });
    if (existedUser) {
        throw new ApiError(409, responseMessage.userMessage.userExist);
    }
    const user = await User.create({ name, email, phoneNumber, password });
    const createdUser = await User.findById(user._id).select(
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
 *  @function loginUser
 * @async
 * @param {import("express").Request} req - Express request object
 *  @param {import("express").Response} res - Express response object
 * @throws {ApiError} Throws an ApiError if validation or login fails
 *  @description  * @description This asynchronous function handles user login. It validates the provided email and password,
 * generates access and refresh tokens upon successful login, sets cookies with the tokens, and sends a response
 * indicating the login status along with the user details (excluding password and refreshToken).
 */
exports.loginUser = asyncHandler(async (req, res) => {
    // Extract user login details from the request body
    const { email, password } = req.body;

    // Find a user with the provided email in the database
    const user = await User.findOne({ email: email });

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
    const { accessToken, refreshToken } = await generateTokens(user._id, 2);

    // Retrieve the logged-in user details excluding password and refreshToken
    const loggedInUser = await User.findById(user._id).select(
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

exports.addAddresses = asyncHandler(async (req, res) => {
    const { address, selected } = req.body;
    const savedAddress = await userAddress.create({
        userId: req.user.userId,
        address,
        selected,
    });

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                savedAddress,
                responseMessage.userMessage.addressAdded,
            ),
        );
});

exports.selectAddresses = asyncHandler(async (req, res) => {
    const { addressId, selected } = req.body;
    const selectedAddress = await userAddress.findByIdAndUpdate(
        addressId,
        {
            $set: {
                selected: selected,
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
                selectedAddress,
                responseMessage.userMessage.addressSelected,
            ),
        );
});

exports.getAllAddressesByUserId = asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user.userId;
    const userAddresses = await userAddress.find({ userId: userId });
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userAddresses,
                responseMessage.userMessage.addressFetchedSuccessfully,
            ),
        );
});

exports.getAddressesById = asyncHandler(async (req, res) => {
    const { addressId } = req.params;
    const userAddresses = await userAddress.findById(addressId);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userAddresses,
                responseMessage.userMessage.addressFetchedSuccessfully,
            ),
        );
});

exports.updateAddress = asyncHandler(async (req, res) => {
    const { addressId } = req.body;
    const savedAddress = await userAddress.findById(addressId);
    if (!savedAddress) {
        throw new ApiError(404, responseMessage.userMessage.addressNotFound);
    }
    savedAddress.address =
        req.body.address != undefined ? req.body.address : savedAddress.address;
    savedAddress.selected =
        req.body.selected != undefined
            ? req.body.selected
            : savedAddress.selected;
    const updatedAddress = await savedAddress.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedAddress,
                responseMessage.userMessage.addressUpdated,
            ),
        );
});

exports.deleteAddress = asyncHandler(async (req, res) => {
    const { addressId } = req.params;
    const savedAddress = await userAddress.findById(addressId);
    if (!savedAddress) {
        throw new ApiError(404, responseMessage.userMessage.addressNotFound);
    }
    if (savedAddress.userId.toString() != req.user.userId.toString()) {
        throw new ApiError(400, responseMessage.userMessage.addressNotDeleted);
    }
    await userAddress.deleteOne({ _id: addressId });
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "",
                responseMessage.userMessage.addressDeleted,
            ),
        );
});

exports.getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, responseMessage.userMessage.userNotFound);
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                responseMessage.userMessage.userFetchedSuccessfully,
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
    const userDocument = await User.findByIdAndUpdate(
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
    const documentToDelete = await User.findOne({
        _id: userId,
    });
    // console.log(documentToDelete.local_profileImagePath);
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
    await User.findByIdAndUpdate(
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
