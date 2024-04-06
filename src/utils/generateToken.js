const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");
const User = require("../models/user.model");
const DeliverBoy = require("../models/deliveryBoy.model");
const Partner = require("../models/partner.model");

/**
 * @function generateTokens
 * @async
 * @param {Object} user - User object for whom tokens are generated.
 * @param {number} userType - Type of user (1: Admin, 2: User, 3: Partner 4: Delivery-boy).
 * @returns {Promise<{accessToken: string, refreshToken: string}>} - Promise resolving to an object with accessToken and refreshToken.
 * @throws {Error} - Throws an error if token generation or saving fails.
 */
const generateTokens = async (user, userType) => {
    try {
        let payload = {
            userId: user._id,
            phoneNumber: user.phoneNumber,
            userType,
        };

        const accessToken = jwt.sign(
            payload,
            process.env.JWT_ACCESS_SECRET_KEY,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
        );
        const refreshToken = jwt.sign(
            payload,
            process.env.JWT_REFRESH_SECRET_KEY,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
        );
        if (userType == 1) {
            const savedAdminToken = await Admin.findById(payload.userId);
            if (savedAdminToken) {
                savedAdminToken.refreshToken = refreshToken;
                await savedAdminToken.save();
                return Promise.resolve({ accessToken, refreshToken });
            }
        }
        if (userType == 2) {
            const savedUserToken = await User.findById(payload.userId);
            if (savedUserToken) {
                savedUserToken.refreshToken = refreshToken;
                await savedUserToken.save();
                return Promise.resolve({ accessToken, refreshToken });
            }
        }
        if (userType == 3) {
            const savedUserToken = await DeliverBoy.findById(payload.userId);
            if (savedUserToken) {
                savedUserToken.refreshToken = refreshToken;
                await savedUserToken.save();
                return Promise.resolve({ accessToken, refreshToken });
            }
        }
        if (userType == 4) {
            const savedUserToken = await Partner.findById(payload.userId);
            if (savedUserToken) {
                savedUserToken.refreshToken = refreshToken;
                await savedUserToken.save();
                return Promise.resolve({ accessToken, refreshToken });
            }
        }
    } catch (error) {
        return Promise.reject(error);
    }
};

module.exports = { generateTokens };
