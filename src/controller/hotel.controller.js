const HotelStart = require("../models/hotelStar.model");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { ApiError } = require("../utils/ApiErrorHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { responseMessage } = require("../constant");
const Hotel = require("../models/hotel.model");
const Dish = require("../models/hotelDish.model");
const DishStar = require("../models/dishStar.model");
const Category = require("../models/category.model");
const { deleteFile } = require("../utils/deleteFile");
const { Types } = require("mongoose");
const moment = require("moment");

exports.addStartToHotel = asyncHandler(async (req, res) => {
    const { hotelId, userId, description, star } = req.body;
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
        throw new ApiError(404, responseMessage.userMessage.hotelNotFound);
    }
    const checkStarExistByUser = await HotelStart.findOne({ hotelId, userId });
    if (checkStarExistByUser?.userId.toString() == userId) {
        throw new ApiError(400, responseMessage.userMessage.alreadyStaredHotel);
    }
    const hotelStar = await HotelStart.create({
        hotelId,
        userId,
        description,
        star,
    });
    res.status(201).json({
        success: true,
        message: responseMessage.userMessage.starAddedSuccessfully,
        data: hotelStar,
    });
});

exports.deleteStartFromHotelByUserId = asyncHandler(async (req, res) => {
    const { hotelId, userId } = req.body;
    const checkStarExistByUser = await HotelStart.findOne({ hotelId, userId });
    if (checkStarExistByUser?.userId.toString() != userId) {
        throw new ApiError(404, responseMessage.userMessage.starNotAdded);
    }
    const hotelStar = await HotelStart.deleteOne({ userId, hotelId });
    res.status(200).json({
        success: true,
        message: responseMessage.userMessage.starDeletedSuccessfully,
        data: hotelStar,
    });
});

exports.deleteStartFromHotelById = asyncHandler(async (req, res) => {
    const { starId } = req.params;
    const checkStarExist = await HotelStart.findById(starId);
    if (!checkStarExist) {
        throw new ApiError(404, responseMessage.userMessage.starNotAdded);
    }
    await HotelStart.findByIdAndDelete(starId);
    res.status(200).json({
        success: true,
        message: responseMessage.userMessage.starDeletedSuccessfully,
        data: null,
    });
});

exports.getAllStartsByHotelId = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { hotelId } = req.params;
    dbQuery.hotelId = hotelId;
    const { q, startDate } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Search based on user query
    if (q) {
        dbQuery = {
            hotelId,
            $or: [{ description: { $regex: `^${q}`, $options: "i" } }],
        };
    }

    // Sort by date range
    if (startDate) {
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        sDate.setHours(0, 0, 0, 0);
        eDate.setHours(23, 59, 59, 999);
        dbQuery.createdAt = {
            $gte: sDate,
            $lte: eDate,
        };
    }
    const dataCount = await HotelStart.countDocuments();
    const startsData = await HotelStart.find(dbQuery)
        .skip(skip)
        .limit(pageSize);

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + startsData.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                content: startsData,
                startItem,
                endItem,
                totalPages,
                pagesize: startsData.length,
                totalDoc: dataCount,
            },
            responseMessage.userMessage.starFetchedSuccessfully,
        ),
    );
});

exports.getStartById = asyncHandler(async (req, res) => {
    const { starId } = req.params;
    const userStar = await HotelStart.findById(starId);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userStar,
                responseMessage.userMessage.starFetchedSuccessfully,
            ),
        );
});

exports.addDish = asyncHandler(async (req, res) => {
    const {
        hotelId,
        categoryId,
        name,
        dishType,
        partnerPrice,
        spicLevel,
        stock,
    } = req.body;

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
        throw new ApiError(404, responseMessage.userMessage.hotelNotFound);
    }
    const category = await Category.findById(categoryId);
    if (!category) {
        throw new ApiError(404, responseMessage.userMessage.categoryNotFound);
    }
    const dish = await Dish.create({
        hotelId,
        categoryId,
        name,
        dishType,
        partnerPrice,
        spicLevel,
        stock,
    });
    res.status(200).json({
        success: true,
        message: responseMessage.userMessage.dishAddedSuccessfully,
        data: dish,
    });
});

exports.uploadDishImage = asyncHandler(async (req, res) => {
    const { dishId } = req.body;
    // console.log(req.file);
    const { filename } = req.file;
    const local_filePath = `upload/${filename}`;
    let document_url = `${req.protocol}://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        document_url = `${req.protocol}://${req.hostname}:8000/upload/${filename}`;
    }
    const savedDish = await Dish.findById(dishId);
    if (savedDish) {
        deleteFile(savedDish?.local_imagePath);
    }
    const dishDocument = await Dish.findByIdAndUpdate(
        dishId,
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
                dishDocument,
                responseMessage.userMessage.dishImageUploadedSuccessfully,
            ),
        );
});

exports.updateDish = asyncHandler(async (req, res) => {
    const {
        dishId,
        categoryId,
        name,
        hotelStatus,
        dishType,
        userPrice,
        spicLevel,
        stock,
        status,
        partnerPrice,
    } = req.body;
    const hotelDish = await Dish.findByIdAndUpdate(
        dishId,
        {
            $set: {
                categoryId: categoryId,
                name: name,
                hotelStatus: hotelStatus,
                dishType: dishType,
                userPrice: userPrice,
                spicLevel: spicLevel,
                stock: stock,
                status: status,
                partnerPrice: partnerPrice,
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
                hotelDish,
                responseMessage.userMessage.dishUpdatedSuccessfully,
            ),
        );
});

exports.deleteDish = asyncHandler(async (req, res) => {
    const { dishId } = req.query;
    const deletedDish = await Dish.findByIdAndDelete(dishId);
    if (!deletedDish?.local_imagePath) {
        throw new ApiError(404, responseMessage.userMessage.dishNotFound);
    }
    deleteFile(deletedDish?.local_imagePath);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "ok",
                responseMessage.userMessage.dishDeletedSuccessfully,
            ),
        );
});

exports.addStartToDish = asyncHandler(async (req, res) => {
    const { dishId, userId, description, star } = req.body;
    const dish = await Dish.findById(dishId);
    if (!dish) {
        throw new ApiError(404, responseMessage.userMessage.dishNotFound);
    }

    const checkStarExistByUser = await DishStar.findOne({ dishId, userId });
    if (checkStarExistByUser?.userId.toString() == userId) {
        throw new ApiError(400, responseMessage.userMessage.alreadyStaredDish);
    }
    const hotelStar = await DishStar.create({
        dishId,
        userId,
        description,
        star,
    });
    res.status(201).json({
        success: true,
        message: responseMessage.userMessage.starAddedSuccessfully,
        data: hotelStar,
    });
});

exports.deleteStartFromDishByUserId = asyncHandler(async (req, res) => {
    const { hotelId, userId } = req.body;
    const checkStarExistByUser = await DishStart.findOne({ hotelId, userId });
    if (checkStarExistByUser?.userId.toString() != userId) {
        throw new ApiError(404, responseMessage.userMessage.starNotAdded);
    }
    const dishStar = await DishStart.deleteOne({ userId, hotelId });
    res.status(200).json({
        success: true,
        message: responseMessage.userMessage.starDeletedSuccessfully,
        data: dishStar,
    });
});

exports.deleteStartFromDishById = asyncHandler(async (req, res) => {
    const { starId } = req.params;
    const checkStarExist = await DishStart.findById(starId);
    if (!checkStarExist) {
        throw new ApiError(404, responseMessage.userMessage.starNotAdded);
    }
    await DishStart.findByIdAndDelete(starId);
    res.status(200).json({
        success: true,
        message: responseMessage.userMessage.starDeletedSuccessfully,
        data: null,
    });
});

exports.getAllStartsByDishId = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { dishId } = req.params;
    dbQuery.dishId = dishId;
    const { q, startDate } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Search based on user query
    if (q) {
        dbQuery = {
            dishId,
            $or: [{ description: { $regex: `^${q}`, $options: "i" } }],
        };
    }

    // Sort by date range
    if (startDate) {
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        sDate.setHours(0, 0, 0, 0);
        eDate.setHours(23, 59, 59, 999);
        dbQuery.createdAt = {
            $gte: sDate,
            $lte: eDate,
        };
    }
    const dataCount = await DishStart.countDocuments();
    const startsData = await DishStart.find(dbQuery).skip(skip).limit(pageSize);

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + startsData.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                content: startsData,
                startItem,
                endItem,
                totalPages,
                pagesize: startsData.length,
                totalDoc: dataCount,
            },
            responseMessage.userMessage.starFetchedSuccessfully,
        ),
    );
});

exports.getDishStartById = asyncHandler(async (req, res) => {
    const { starId } = req.params;
    const userStar = await DishStart.findById(starId);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userStar,
                responseMessage.userMessage.starFetchedSuccessfully,
            ),
        );
});

exports.getDishById = asyncHandler(async (req, res) => {
    const { dishId } = req.params;
    const pipeline = [
        {
            $match: {
                _id: new Types.ObjectId(dishId), // Convert dishId to ObjectId if needed
            },
        },
        {
            $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "categoryDetails",
                pipeline: [
                    {
                        $project: {
                            name: 1,
                            image_url: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$categoryDetails",
        },
        {
            $lookup: {
                from: "hotels",
                localField: "hotelId",
                foreignField: "_id",
                as: "hotelDetails",
                pipeline: [
                    {
                        $project: {
                            hotelName: 1,
                            image_url: 1,
                            address: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$hotelDetails",
        },
        {
            $lookup: {
                as: "dishStars",
                from: "dishstars",
                foreignField: "dishId",
                localField: "_id",
                pipeline: [
                    {
                        $lookup: {
                            as: "user",
                            from: "users",
                            foreignField: "_id",
                            localField: "userId",
                            pipeline: [
                                {
                                    $project: {
                                        name: 1,
                                        profile_image: 1,
                                    },
                                },
                            ],
                        },
                    },
                    // Unwind the user array to work with individual user object
                    {
                        $unwind: "$user",
                    },
                ],
            },
        },
        // Unwind the Dishstars array to work with individual star ratings
        {
            $unwind: "$dishStars",
        },
        // Gro
        // Calculate star counts
        {
            $group: {
                _id: {
                    _id:"$_id",
                    dishName: "$name",
                    image_url: "$image_url",
                    dishType: "$dishType",
                    partnerPrice: "$partnerPrice",
                    userPrice: "$userPrice",
                    spicLevel: "$spicLevel",
                    stock: "$stock",
                    status: "$status",
                    hotelDetails: "$hotelDetails",
                    categoryDetails: "$categoryDetails",
                },
                totalCount: { $sum: 1 },
                "1starCount": {
                    $sum: {
                        $cond: [{ $eq: ["$dishStars.star", 1] }, 1, 0],
                    },
                },
                "2starCount": {
                    $sum: {
                        $cond: [{ $eq: ["$dishStars.star", 2] }, 1, 0],
                    },
                },
                "3starCount": {
                    $sum: {
                        $cond: [{ $eq: ["$dishStars.star", 3] }, 1, 0],
                    },
                },
                "4starCount": {
                    $sum: {
                        $cond: [{ $eq: ["$dishStars.star", 4] }, 1, 0],
                    },
                },
                "5starCount": {
                    $sum: {
                        $cond: [{ $eq: ["$dishStars.star", 5] }, 1, 0],
                    },
                },
                // Push each star data into an array
                starData: { $push: "$dishStars" },
            },
        },
        // Project the final result with star counts
        {
            $project: {
                _id: "$_id",
                dishDetails: 1,
                // Include the array of star data
                ratingData: "$starData",
                starCounts: {
                    totalCount: "$totalCount",
                    "1starCount": "$1starCount",
                    "2starCount": "$2starCount",
                    "3starCount": "$3starCount",
                    "4starCount": "$4starCount",
                    "5starCount": "$5starCount",
                },
            },
        },
    ];

    const dishAggregate = await Dish.aggregate(pipeline);
    if (!dishAggregate || dishAggregate.length === 0) {
        throw new ApiError(404, responseMessage.userMessage.dishNotFound);
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                dishAggregate[0],
                responseMessage.userMessage.dishFetchedSuccessfully,
            ),
        );
});
