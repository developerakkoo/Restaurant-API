const User = require("../models/user.model");
const Cart = require("../models/cart.model");
const Hotel = require("../models/hotel.model");
const Category = require("../models/category.model");
const { responseMessage, cookieOptions } = require("../constant");
const Order = require("../models/order.model");
const Favorite = require('../models/favorite.model');
const Rating = require('../models/rating.model');
const UserTrack = require("../models/userTrack.model");
const userAddress = require("../models/userAddress.model");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { recommendDishes } = require("../utils/helper.util");
const { asyncHandler } = require("../utils/asyncHandler");
const { generateTokens } = require("../utils/generateToken");
const { deleteFile } = require("../utils/deleteFile");
const moment = require("moment");


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
    const createdUser = await User.findById(user._id)
        .select("-password -refreshToken")
        .lean();
    if (!createdUser) {
        throw new ApiError(500, responseMessage.userMessage.userNotCreated);
    }
    const cart = await Cart.create({ userId: createdUser._id });
    createdUser.cartId = cart._id;
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
    const { phoneNumber } = req.body;
   
    // Find a user with the provided number in the database
    let user = await User.findOne({ phoneNumber });

    // If the user is not found, return a 404 response
    if (!user) {
        user = await User.create({ phoneNumber });

        // Generate access and refresh tokens for the logged-in user
 const { accessToken, refreshToken } = await generateTokens(user._id, 2);

 // Retrieve the logged-in user details excluding password and refreshToken
 const loggedInUser = await User.findById(user._id).select(
     "-password -refreshToken",
 );

 // Send a successful login response with cookies containing access and refresh tokens
 return res
     .status(200)
     .cookie("accessToken", accessToken, cookieOptions)
     .cookie("refreshToken", refreshToken, cookieOptions)
     .json(
         {
                status: 200,
                data: loggedInUser,
                accessToken: accessToken,
                refreshToken: refreshToken,
                message: responseMessage.userMessage.loginSuccessful,
                isNewUser: true
         }
     );

    
    }

   if(user){
     // If the user is blocked
     if (user.status == 1) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { isBlocked: true },
                    "'Your account has been blocked. Please contact support for more information.'",
                ),
            );
    }else{
 // Generate access and refresh tokens for the logged-in user
 const { accessToken, refreshToken } = await generateTokens(user._id, 2);

 // Retrieve the logged-in user details excluding password and refreshToken
 const loggedInUser = await User.findById(user._id).select(
     "-password -refreshToken",
 );

 // Send a successful login response with cookies containing access and refresh tokens
 return res
     .status(200)
     .cookie("accessToken", accessToken, cookieOptions)
     .cookie("refreshToken", refreshToken, cookieOptions)
     .json(
         {
                status: 200,
                data: loggedInUser,
                accessToken: accessToken,
                refreshToken: refreshToken,
                message: responseMessage.userMessage.loginSuccessful,
                isNewUser: false
         }
     );

    }

}
});

exports.checkUserStatus = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;

    // Find a user with the provided phone number in the database
    const user = await User.findOne({ phoneNumber });
    if (user.status == 1) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { isBlocked: true },
                    "'Your account has been blocked. Please contact support for more information.'",
                ),
            );
    }
    res.status(200).json(new ApiResponse(200, { isBlocked: false }, "success"));
});

exports.updateUserProfile = asyncHandler(async (req, res) => {
    const { name, email, phoneNumber, firebaseToken, isOnline } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
        req.params.userId,
        {
            $set: {
                name: name,
                email: email,
                phoneNumber: phoneNumber,
                firebaseToken,
                isOnline,
            },
        },
        { new: true },
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "User profile updated"));
});

exports.addAddresses = asyncHandler(async (req, res) => {
    const { type, address, selected, lng, lat } = req.body;
    const savedAddress = await userAddress.create({
        userId: req.query.userId || req.user.userId,
        type,
        address,
        selected,
        location: {
            type: "Point",
            coordinates: [lng, lat],
        },
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


exports.getCoordinatesForCalculations = asyncHandler(async (req,res) =>
{
    try {
        const { userId, hotelId } = req.params;
    
        console.log(req.params);
        
        // Fetch hotel location
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) {
          return res.status(404).json({ message: "Hotel not found" });
        }
    
        // Fetch user's selected address
        const user = await userAddress.findOne({ userId, selected: true });
        if (!user) {
          return res.status(404).json({ message: "User address not found" });
        }
    
        res.status(200).json({
          success: true,
          data: {
            hotelCoordinates: hotel.location.coordinates, // [lat, lng]
            userCoordinates: user.location.coordinates, // [lat, lng]
          },
        });
      } catch (error) {
        console.error("Error fetching coordinates:", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
})
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
    savedAddress.type =
        req.body.type != undefined ? req.body.type : savedAddress.type;
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
    const { addressId,userId } = req.params;
    const savedAddress = await userAddress.findById(addressId);
    if (!savedAddress) {
        throw new ApiError(404, responseMessage.userMessage.addressNotFound);
    }
    if (savedAddress.userId.toString() !=  userId) {
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

exports.deleteUserData = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);
    const address = await userAddress.deleteMany({ userId });
    const order = await Order.deleteMany({ userId });

    res.status(200).json(
        new ApiResponse(200, "ok", "User data deleted successfully"),
    );
});

exports.getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findById(userId).select("-refreshToken -password");
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
    let document_url = `https://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        document_url = `https://${req.hostname}/upload/${filename}`;
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

exports.addUserTrackRecord = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const today = moment().format("DD-MM-YYYY");
    const recordExists = await UserTrack.findOne({
        userId,
        date: today,
    });
    if (recordExists) {
        return res
            .status(400)
            .json(
                new ApiError(
                    400,
                    null,
                    responseMessage.userMessage.trackRecordAlreadyExists,
                ),
            );
    }
    const userTrackRecord = await UserTrack.create({
        userId: userId,
        date: today,
    });
    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                userTrackRecord,
                responseMessage.userMessage.trackRecordAdded,
            ),
        );
});

exports.getRecommendation = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, responseMessage.userMessage.userNotFound);
    }

    const recommendations = await recommendDishes(userId);

    res.status(200).json(
        new ApiResponse(
            200,
            recommendations,
            responseMessage.userMessage.recommendationsFetchedSuccessfully,
        ),
    );
});

exports.hotelAndCategorySearch = asyncHandler(async (req, res) => {
    const { q } = req.query;

    const searchRegex = new RegExp(q.trim(), "i");

    let hotelDbQuery = {
        $or: [
            { hotelName: { $regex: searchRegex } },
            { hotelName: { $regex: searchRegex } },
        ],
    };

    let categoryDbQuery = {
        $or: [
            { name: { $regex: searchRegex } },
            { name: { $regex: searchRegex } },
        ],
    };
    const hotels = await Hotel.find(hotelDbQuery)
        .populate("category", "name")
        .exec();
    // Perform text search on the Category model
    const categories = await Category.find(categoryDbQuery).exec();

    // Format the results
    const formattedResults = [];

    hotels.forEach((hotel) => {
        formattedResults.push({
            type: "hotel",
            id: hotel._id,
            name: hotel.hotelName,
            category: hotel.category,
        });
    });

    categories.forEach((category) => {
        formattedResults.push({
            type: "category",
            id: category._id,
            name: category.name,
        });
    });

    res.status(200).json(
        new ApiResponse(
            200,
            formattedResults,
            "search Results Fetched Successfully",
        ),
    );
});


exports.getUserProfileStats = asyncHandler(async (req, res) => {
    const userId = req.params.id;
  
    const [orderCount, favHotels, ratingStats] = await Promise.all([
      // Total orders
      Order.countDocuments({ userId }),
  
      // Unique favorite hotels
      Favorite.aggregate([
        { $match: { userId, hotelId: { $exists: true } } },
        { $group: { _id: "$hotelId" } },
        { $count: "total" }
      ]),
  
      // Average ratings by user
      Rating.aggregate([
        { $match: { userId, status: "active" } },
        {
          $group: {
            _id: null,
            avgFoodRating: { $avg: "$foodRating" },
            avgDeliveryRating: { $avg: "$deliveryRating" },
            avgRestaurantRating: { $avg: "$restaurantRating" },
          },
        },
      ]),
    ]);
  
    const stats = {
      totalOrders: orderCount,
      favoriteHotels: favHotels[0]?.total || 0,
      averageRatings: {
        food: ratingStats[0]?.avgFoodRating?.toFixed(2) || "0.00",
        delivery: ratingStats[0]?.avgDeliveryRating?.toFixed(2) || "0.00",
        restaurant: ratingStats[0]?.avgRestaurantRating?.toFixed(2) || "0.00",
      }
    };
  
    return res.status(200).json({
      success: true,
      data: stats,
    });
  });
