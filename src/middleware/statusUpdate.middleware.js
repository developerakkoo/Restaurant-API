const { ApiResponse } = require("../utils/ApiResponseHandler");

const authorizeStatusUpdate = (req, res, next) => {
    const { userId, userType } = req.body;
    const authUser = req.user;

    if (!authUser) {
        return res.status(401).json(
            new ApiResponse(401, null, "Authentication required")
        );
    }

    const authUserType = parseInt(authUser.userType, 10);
    const requestedUserType = parseInt(userType, 10);

    if (authUserType === 1) {
        return next();
    }

    if (authUserType === 3 && requestedUserType === 3) {
        if (authUser.userId.toString() !== userId.toString()) {
            return res.status(403).json(
                new ApiResponse(403, null, "Cannot update another user's status")
            );
        }
        return next();
    }

    return res.status(403).json(
        new ApiResponse(403, null, "Not authorized to update this status")
    );
};

module.exports = { authorizeStatusUpdate };
