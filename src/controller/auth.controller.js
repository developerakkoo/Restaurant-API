const Admin = require("../models/admin.model");
const User = require("../models/user.model");
const DeliverBoy = require("../models/deliveryBoy.model");
const Partner = require("../models/partner.model");
const { ApiError } = require("../utils/ApiErrorHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { responseMessage, otpType } = require("../constant");
const { generateTokens } = require("../utils/generateToken");
const jwt = require("jsonwebtoken");
const { findUserByEmail } = require("../utils/helper.util");
const sendEmail = require("../utils/email.utils");
const { sendMobileOtp, verifyMobileOtp } = require("../utils/otp.utils");
const { hash } = require("bcrypt");
const MSG91_LOGIN_OTP_TEMPLATE_ID = process.env.MSG91_LOGIN_OTP_TEMPLATE_ID;
const MSG91_FORGOTPASS_OTP_TEMPLATE_ID =
    process.env.MSG91_FORGOTPASS_OTP_TEMPLATE_ID;

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

//sending mail about rest password with rest password page link
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await findUserByEmail(email);

    if (!result) {
        return res.render("error", { message: "User Not Registered" });
    }

    const { user, model } = result;

    const payload = {
        userId: user._id,
        email: user.email,
    };

    let token = jwt.sign(
        payload,
        process.env.JWT_ACCESS_SECRET_KEY + user.password,
        { expiresIn: 86400 },
    ); // 24 hours
    const url =
        "http://localhost:8000/api/v1/auth/rest-password/" +
        user._id +
        "/" +
        token;

    sendEmail(user.email, "Rest password", url);

    res.render("linkSend");
});

//user rest password page for getting the new password from user

exports.getResetPassword = async (req, res) => {
    try {
        const { id, token } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.render("error", { message: "Invalid signature" });
        }
        const payload = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET_KEY + user.password,
        );
        res.render("reset-password", { email: user.email });
    } catch (error) {
        return res.render("error", { message: error.message });
    }
};

//updating user password

exports.ResetPassword = async (req, res) => {
    const { id, token } = req.params;
    const user = await User.findOne({ _id: req.params.id });
    if (!user) {
        return res.render("error", { message: "Invalid signature" });
    }
    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET_KEY + user.password,
        );

        user.password = (await hash(req.body.password, 12))
            ? await hash(req.body.password, 12)
            : user.password;
        const updatedUser = await user.save(user);
        const postRes = {
            Id: updatedUser._id,
            email: updatedUser.email,
            photo: updatedUser.photo,
        };
        res.render("success", { message: "Password Reset Success" });
    } catch (error) {
        console.log(error.message);
        return res.render("error", { message: "Invalid signature" });
    }
};

exports.getCurrentUserStatus = asyncHandler(async (req, res) => {
    const accessToken =
        req.headers["x-access-token"] || req.cookies["accessToken"];
    if (!accessToken) {
        // throw new ApiError(401, "Access Denied: No access token provided!");
        return res
            .status(403)
            .send({ message: "Access Denied: No access token provided!" });
    }
    jwt.verify(
        accessToken,
        process.env.JWT_ACCESS_SECRET_KEY,
        (error, decoded) => {
            if (error) {
                // throw new ApiError(401, "Access Denied: Unauthorized!");
                return res
                    .status(200)
                    .json(
                        new ApiResponse(
                            200,
                            { loggedIn: false },
                            "User not logged in",
                        ),
                    );
            }
            req.user = decoded;
            return res
                .status(200)
                .json(
                    new ApiResponse(200, { loggedIn: true }, "User logged in"),
                );
        },
    );
});

/* Send OTP to user */
exports.sendOtp = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;
    if (req.body.otpType == otpType.LOGIN) {
        const data = await sendMobileOtp(
            phoneNumber,
            MSG91_LOGIN_OTP_TEMPLATE_ID,
        );
        return res
            .status(200)
            .json(new ApiResponse(200, data, "OTP sent successfully"));
    }
    const data = await sendMobileOtp(
        phoneNumber,
        MSG91_FORGOTPASS_OTP_TEMPLATE_ID,
    );
    return res
        .status(200)
        .json(new ApiResponse(200, data, "OTP sent successfully"));
});

/* Verify OTP */

exports.verifyOtp = asyncHandler(async (req, res) => {
    const { phoneNumber, otp } = req.body;
    const data = await verifyMobileOtp(phoneNumber, otp);
    if (data.type === "success") {
        return res.status(200).json(new ApiResponse(200, data, "OTP verified"));
    } else {
        return res.status(400).json(new ApiResponse(400, data, "Invalid OTP"));
    }
});

/* Handel social media login */
exports.handleSocialAuth = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const { accessToken, refreshToken } = await generateTokens(user._id, 2);

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    };
    let hostname = `https://api.dropeat.in`;
    if (process.env.NODE_ENV !== "production") {
        hostname = `http://localhost:8000`;
    }
    return res
        .status(301)
        .cookie("accessToken", accessToken, options) // set the access token in the cookie
        .cookie("refreshToken", refreshToken, options) // set the refresh token in the cookie
        .redirect(
            // redirect user to the frontend with access and refresh token in case user is not using cookies
            `${hostname}/api/v1/auth/sso/success?accessToken=${accessToken}&refreshToken=${refreshToken}`,
        );
});
