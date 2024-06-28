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
const { findUserByEmail } = require("../utils/helper.util");

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
    console.log("====================================");
    console.log(email);
    console.log("====================================");
    const result = await findUserByEmail(email);

    if (!result) {
        res.send("User Not Registered");
        return;
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

    // sendResetEmail(user.email, user._id, token, req);

    res.render("linkSend");
});

//user rest password page for getting the new password from user

exports.getResetPassword = asyncHandler(async (req, res) => {
    const { id, token } = req.params;
    const user = await User.findOne({ _id: id });
    if (!user) {
        res.send("Invalid Id...!");
    }
    const payload = jwt.verify(
        token,
        process.env.JWT_SECRET_KEY + user.password,
    );
    res.render("reset-password", { email: user.email });
});

//updating user password

exports.ResetPassword = asyncHandler(async (req, res) => {
    const { id, token } = req.params;
    const user = await User.findOne({ _id: req.params.id });
    if (!user) {
        res.send("Invalid Id...!");
    }
    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET_KEY + user.password,
        );

        user.password = bcrypt.hashSync(req.body.password, 16)
            ? bcrypt.hashSync(req.body.password, 16)
            : user.password;
        const updatedUser = await user.save(user);
        const postRes = {
            Id: updatedUser._id,
            email: updatedUser.email,
            photo: updatedUser.photo,
        };
        res.render("success");
    } catch (error) {
        console.log(error.message);
        res.send(error.message);
    }
});

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
