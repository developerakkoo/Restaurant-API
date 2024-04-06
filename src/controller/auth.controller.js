const Admin = require("../models/admin.model");
const User = require("../models/user.model");
const DeliverBoy = require("../models/deliveryBoy.model");
const Partner = require("../models/partner.model");
const { ApiError } = require("../utils/ApiErrorHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { responseMessage } = require("../constant");
const { generateTokens } = require("../utils/generateToken");
const jwt = require("jsonwebtoken");

/**
 * @function logoutUser
 * @async
 * @param {import("express").Request} req - Express request object containing user details.
 * @param {import("express").Response} res - Express response object for sending the logout response.
 * @returns {void}
 * @description This asynchronous function handles user logout. It removes the refreshToken field from the user document,
 * clears the access and refresh token cookies, and sends a response indicating a successful logout.
 */

exports.logoutUser = asyncHandler(async (req, res) => {
    // Update the user document to unset the refreshToken field
    if (req.user.userType === 1) {
        await Admin.findByIdAndUpdate(
            req.user.userId,
            {
                $unset: {
                    refreshToken: 1, // this removes the field from the document
                },
            },
            {
                new: true,
            },
        );
    }

    if (req.user.userType === 2) {
        await User.findByIdAndUpdate(
            req.user.userId,
            {
                $unset: {
                    refreshToken: 1, // this removes the field from the document
                },
            },
            {
                new: true,
            },
        );
    }
    if (req.user.userType === 3) {
        await DeliverBoy.findByIdAndUpdate(
            req.user.userId,
            {
                $unset: {
                    refreshToken: 1, // this removes the field from the document
                },
            },
            {
                new: true,
            },
        );
    }

    if (req.user.userType === 4) {
        await Partner.findByIdAndUpdate(
            req.user.userId,
            {
                $unset: {
                    refreshToken: 1, // this removes the field from the document
                },
            },
            {
                new: true,
            },
        );
    }

    // Set options for HTTP cookies
    const options = {
        httpOnly: true,
        secure: true,
    };

    // Clear the access and refresh token cookies
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                responseMessage.userMessage.logoutSuccessful,
            ),
        );
});

exports.reGenerateAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(403, responseMessage.userMessage.unauthorized);
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.JWT_REFRESH_SECRET_KEY,
        );
        // console.log(decodedToken);
        let user;
        if (decodedToken.userType === 1) {
            user = await Admin.findById(decodedToken?.userId);
        }
        if (decodedToken.userType === 2) {
            user = await User.findById(decodedToken?.userId);
        }
        if (decodedToken.userType === 3) {
            user = await DeliverBoy.findById(decodedToken?.userId);
        }
        if (!user) {
            throw new ApiError(401, responseMessage.userMessage.invalidToken);
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(
                401,
                responseMessage.userMessage.invalidRefreshToken,
            );
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, refreshToken } = await generateTokens(
            user._id,
            decodedToken.userType,
        );

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: refreshToken },
                    responseMessage.userMessage.reGeneratedToken,
                ),
            );
    } catch (error) {
        throw new ApiError(
            401,
            error?.message || responseMessage.userMessage.invalidRefreshToken,
        );
    }
});
