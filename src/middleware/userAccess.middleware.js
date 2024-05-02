const { ApiResponse } = require("../utils/ApiResponseHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { responseMessage } = require("../constant");


exports.adminPrivilegesRequired = asyncHandler(async (req, res, next) => {
    
    if (req.user.userType !== 1) {
        return res
            .status(403)
            .json(
                new ApiResponse(
                    403,
                    null,
                    responseMessage.adminMessage.adminPrivilegesRequired,
                ),
            );
    }
    next();
});

