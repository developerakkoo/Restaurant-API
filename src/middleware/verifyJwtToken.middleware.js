require('dotenv').config();
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');

const { ApiResponse } = require("../utils/ApiResponseHandler");

/**
 * @function verify_access_token
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next function
 * @throws {ApiError} Throws an ApiError if verification fails
 * 
 * @description This function verifies the access token provided in the request headers. 
 * If the access token is not provided, it returns a 403 Forbidden response. 
 * If the access token is provided, it verifies the token using the JWT_ACCESS_SECRET_KEY. 
 * If verification is successful, it attaches the decoded user data to the request object and 
 * calls the next middleware. If verification fails, it returns a 401 Unauthorized response. 
 * Any errors during the verification process are caught by the errorHandler middleware, 
 * which returns an appropriate response to the client.
 */
const verify_access_token = (req,res, next) => {
    try {
        const accessToken = req.headers['x-access-token'] || req.cookies.accessToken;
        if (!accessToken) {
        // throw new ApiError(401, "Access Denied: No access token provided!");
            return res.status(403).send({message: "Access Denied: No access token provided!"});
        }
        jwt.verify(accessToken,process.env.JWT_ACCESS_SECRET_KEY,
            (error, decoded) => {
                if (error) {
                    // throw new ApiError(401, "Access Denied: Unauthorized!");
                    return res.status(401).send({message: "Access Denied: Unauthorized!"});
                }
                req.user = decoded
                next()
            });
    } catch (error) {
        // throw new ApiError(500, error.message);
        res.status(500).json({Message:error.message,status:'ERROR',statusCode:500});
    }
}


/**
 * @function verify_refresh_token
 * @async
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next function
 * @throws {ApiError} Throws an ApiError if verification fails
 * 
 * @description This asynchronous function verifies the refresh token provided in the request headers.
 * It checks for the refresh token in different user types (Customer, Driver, Admin, partner) and
 * verifies it using the JWT_REFRESH_SECRET_KEY. If successful, it attaches the decoded user data to the
 * request object and calls the next middleware. If unsuccessful, it returns an appropriate error response.
 * The errorHandler middleware will catch any errors at the central place and return an appropriate response to the client.
 */
const verify_refresh_token = async (req, res, next) => {
    try {
        const refreshToken = req.headers['x-refresh-token']|| req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(403).send(
                new ApiResponse(403, '', 'Access Denied: No refresh token provided!')
            );
        }

        const userTypes = [Customer, Driver, Admin, Sealer];

        for (const UserType of userTypes) {
            const userToken = await UserType.findOne({ refreshToken });

            if (userToken) {
                jwt.verify(userToken.refreshToken, process.env.JWT_REFRESH_SECRET_KEY, (error, decoded) => {
                    if (error) {
                        return res.status(401).send(
                            new ApiResponse(401, '', 'Access Denied: Unauthorized!')
                        );
                    }
                    req.userData = decoded;
                    next();
                });
                return; // Exit the loop if a matching user type is found
            }
        }

        // If no matching user type is found
        return res.status(401).json(
            new ApiResponse(401, '', 'Access Denied: Unauthorized!')
        );
    } catch (error) {
        res.status(500).json({ Message: error.message, status: 'ERROR', statusCode: 500 });
    }
};




module.exports = { verify_access_token, verify_refresh_token };