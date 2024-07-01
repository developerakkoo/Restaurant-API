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

exports.getHotelById = asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const { populate } = req.query;
    let pipeline = [
        {
            $match: {
                _id: new Types.ObjectId(hotelId), // Convert dishId to ObjectId if needed
            },
        },
    ];
    if (populate && Number(populate) === 1) {
        // Add a lookup stage to fetch hotel owner details
        pipeline.splice(
            1,
            0,
            {
                $lookup: {
                    as: "hotelOwner",
                    from: "partners",
                    foreignField: "_id",
                    localField: "userId",
                    pipeline: [
                        {
                            $project: {
                                name: 1,
                                profile_image: 1,
                                email: 1,
                                phoneNumber: 1,
                                status: 1,
                            },
                        },
                    ],
                },
            },
            // Add a lookup stage to fetch hotel stars data
            {
                $lookup: {
                    as: "hotelstars",
                    from: "hotelstars",
                    foreignField: "hotelId",
                    localField: "_id",
                    //adding a pipeline for getting user who start the hotel
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
            // Unwind the hotelstars array to work with individual star ratings
            {
                $unwind: "$hotelstars",
            },
            // Group by hotel details and calculate star counts
            {
                $group: {
                    _id: {
                        hotelId: "$_id",
                        hotelName: "$hotelName",
                        image_url: "$image_url",
                        address: "$address",
                        hotelOwner: "$hotelOwner",
                    },
                    // Count the total number of stars for each hotel
                    totalCount: { $sum: 1 },
                    "1starCount": {
                        $sum: {
                            $cond: [{ $eq: ["$hotelstars.star", 1] }, 1, 0],
                        },
                    },
                    "2starCount": {
                        $sum: {
                            $cond: [{ $eq: ["$hotelstars.star", 2] }, 1, 0],
                        },
                    },
                    // Similar counts for other star ratings
                    "3starCount": {
                        $sum: {
                            $cond: [{ $eq: ["$hotelstars.star", 3] }, 1, 0],
                        },
                    },
                    "4starCount": {
                        $sum: {
                            $cond: [{ $eq: ["$hotelstars.star", 4] }, 1, 0],
                        },
                    },
                    "5starCount": {
                        $sum: {
                            $cond: [{ $eq: ["$hotelstars.star", 5] }, 1, 0],
                        },
                    },
                    // Push each star data into an array
                    starData: { $push: "$hotelstars" },
                },
            },
            // Unwind the hotelOwner array to flatten it
            {
                $unwind: "$_id.hotelOwner",
            },
            // Project the final result with necessary fields
            {
                $project: {
                    _id: 0,
                    hotelId: "$_id.hotelId",
                    hotelName: "$_id.hotelName",
                    image_url: "$_id.image_url",
                    address: "$_id.address",
                    // Structure star counts
                    starCounts: {
                        "1starCount": "$1starCount",
                        "2starCount": "$2starCount",
                        "3starCount": "$3starCount",
                        "4starCount": "$4starCount",
                        "5starCount": "$5starCount",
                        totalCount: "$totalCount",
                    },
                    // Include the array of star data
                    ratingData: "$starData",
                    // Flatten the partner/hotelOwner array
                    partner: "$_id.hotelOwner",
                },
            },
        );
    }
    const hotel = await Hotel.aggregate(pipeline).exec();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                hotel[0],
                responseMessage.hotelFetchedSuccessfully,
            ),
        );
});

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
    res.status(201).json(
        new ApiResponse(
            201,
            hotelStar,
            responseMessage.userMessage.starAddedSuccessfully,
        ),
    );
});

exports.deleteStartFromHotelByUserId = asyncHandler(async (req, res) => {
    const { hotelId, userId } = req.body;
    const checkStarExistByUser = await HotelStart.findOne({ hotelId, userId });
    if (checkStarExistByUser?.userId.toString() != userId) {
        throw new ApiError(404, responseMessage.userMessage.starNotAdded);
    }
    const hotelStar = await HotelStart.deleteOne({ userId, hotelId });
    res.status(200).json(
        new ApiResponse(
            200,
            hotelStar,
            responseMessage.userMessage.starDeletedSuccessfully,
        ),
    );
});

exports.deleteStartFromHotelById = asyncHandler(async (req, res) => {
    const { starId } = req.params;
    const checkStarExist = await HotelStart.findById(starId);
    if (!checkStarExist) {
        throw new ApiError(404, responseMessage.userMessage.starNotAdded);
    }
    await HotelStart.findByIdAndDelete(starId);
    res.status(200).json(
        new ApiResponse(
            200,
            null,
            responseMessage.userMessage.starDeletedSuccessfully,
        ),
    );
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
    if (!userStar) {
        throw new ApiError(404, responseMessage.userMessage.starNotFound);
    }
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
        timeToPrepare,
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
        timeToPrepare,
        stock,
    });
    res.status(201).json(
        new ApiResponse(
            201,
            dish,
            responseMessage.userMessage.dishAddedSuccessfully,
        ),
    );
});

exports.uploadDishImage = asyncHandler(async (req, res) => {
    const { dishId } = req.body;
    // console.log(req.file);
    const { filename } = req.file;
    const local_filePath = `upload/${filename}`;
    let document_url = `https://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        document_url = `https://${req.hostname}:8000/upload/${filename}`;
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
        timeToPrepare,
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
                timeToPrepare: timeToPrepare,
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
    res.status(201).json(
        new ApiResponse(
            201,
            hotelStar,
            responseMessage.userMessage.starAddedSuccessfully,
        ),
    );
});

exports.deleteStartFromDishByUserId = asyncHandler(async (req, res) => {
    const { dishId, userId } = req.body;
    const checkStarExistByUser = await DishStar.findOne({ dishId, userId });
    if (checkStarExistByUser?.userId.toString() != userId) {
        throw new ApiError(404, responseMessage.userMessage.starNotAdded);
    }
    await DishStar.deleteOne({ userId, dishId });
    res.status(200).json(
        new ApiResponse(
            200,
            "ok",
            responseMessage.userMessage.starDeletedSuccessfully,
        ),
    );
});

exports.deleteStartFromDishById = asyncHandler(async (req, res) => {
    const { starId } = req.params;
    const checkStarExist = await DishStar.findById(starId);
    if (!checkStarExist) {
        throw new ApiError(404, responseMessage.userMessage.starNotAdded);
    }
    await DishStar.findByIdAndDelete(starId);
    res.status(200).json(
        new ApiResponse(
            200,
            "ok",
            responseMessage.userMessage.starDeletedSuccessfully,
        ),
    );
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
    const dataCount = await DishStar.countDocuments();
    const startsData = await DishStar.find(dbQuery).skip(skip).limit(pageSize);

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
    const userStar = await DishStar.findById(starId);
    if (!userStar) {
        throw new ApiError(404, responseMessage.userMessage.starNotFound);
    }
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
    const { populate } = req.query;
    let pipeline = [
        {
            $match: {
                _id: new Types.ObjectId(dishId), // Convert dishId to ObjectId if needed
            },
        },
    ];
    if (populate && Number(populate) === 1) {
        pipeline.splice(
            1,
            0,
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
                                userId: 1,
                            },
                        },
                        {
                            $lookup: {
                                as: "hotelOwner",
                                from: "partners",
                                foreignField: "_id",
                                localField: "userId",
                                pipeline: [
                                    {
                                        $project: {
                                            name: 1,
                                            profile_image: 1,
                                            email: 1,
                                            phoneNumber: 1,
                                            status: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $unwind: "$hotelOwner",
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
                        _id: "$_id",
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
        );
    }
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

exports.getAllDishes = asyncHandler(async (req, res) => {
    let dbQuery = {
        status: 2, // for approved dishes by admin
        stock: 1, // for available in stocks only
    };
    const {
        q,
        startDate,
        populate,
        status,
        hotelId,
        categoryId,
        dishType,
        spicLevel,
        lowerPrice,
        upperPrice,
    } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Search based on user query
    if (q) {
        const words = q
            .split(" ")
            .map((word) => `\\b${word}\\b`)
            .join("|");
        dbQuery = {
            ...dbQuery,
            $or: [
                { name: { $regex: new RegExp(words, "i") } },
                { dishType: { $regex: `^${q}` } },
            ],
        };
    }

    // Sort by status
    if (status) {
        dbQuery.status = status;
    }
    // Sort by price range
    if (lowerPrice && upperPrice) {
        dbQuery.userPrice = {
            $gte: lowerPrice,
            $lte: upperPrice,
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
    // Sort by spic level
    if (spicLevel) {
        dbQuery.spicLevel = spicLevel;
    }
    // Sort by dish type
    if (dishType) {
        dbQuery.dishType = dishType;
    }
    // Sort by category (user can sort by multiple categories)
    if (categoryId) {
        const categoryIds = categoryId
            .split(",")
            .map((id) => new Types.ObjectId(id.trim()));
        dbQuery.categoryId = { $in: categoryIds };
    }

    // Sort by hotel
    if (hotelId) {
        dbQuery.hotelId = new Types.ObjectId(hotelId);
    }

    let pipeline = [
        {
            $match: dbQuery,
        },
        {
            $project: { partnerPrice: 0 }, // Exclude partnerPrice fields from the result
        },
        {
            $skip: skip,
        },
        {
            $limit: pageSize,
        },
    ];

    if (q) {
        pipeline.splice(0, 0, {
            $match: {
                $text: {
                    $search: q,
                    $language: "en",
                },
            },
        });
    }
    if (populate && Number(populate) === 1) {
        pipeline.splice(
            2,
            0,
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
                $unwind: {
                    path: "$categoryDetails",
                    preserveNullAndEmptyArrays: true,
                },
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
                                userId: 1,
                            },
                        },
                        {
                            $lookup: {
                                as: "hotelOwner",
                                from: "partners",
                                foreignField: "_id",
                                localField: "userId",
                                pipeline: [
                                    {
                                        $project: {
                                            name: 1,
                                            profile_image: 1,
                                            email: 1,
                                            phoneNumber: 1,
                                            status: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $unwind: {
                                path: "$hotelOwner",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$hotelDetails",
                    preserveNullAndEmptyArrays: true,
                },
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
                                            profile_image: {
                                                $ifNull: ["$profile_image", ""],
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $unwind: {
                                path: "$user",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$dishStars",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: {
                        _id: "$_id",
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
                    starData: { $push: "$dishStars" },
                },
            },
            {
                $project: {
                    _id: "$_id",
                    dishDetails: 1,
                    ratingData: {
                        $map: {
                            input: "$starData",
                            as: "star",
                            in: {
                                _id: "$$star._id",
                                dishId: "$$star.dishId",
                                userId: "$$star.userId",
                                description: "$$star.description",
                                star: "$$star.star",
                                createdAt: "$$star.createdAt",
                                updatedAt: "$$star.updatedAt",
                                user: {
                                    _id: "$$star.user._id",
                                    name: "$$star.user.name",
                                    profile_image: {
                                        $ifNull: [
                                            "$$star.user.profile_image",
                                            "",
                                        ],
                                    },
                                },
                            },
                        },
                    },
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
        );
    }

    const dishAggregate = await Dish.aggregate(pipeline);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                dishAggregate,
                responseMessage.userMessage.dishFetchedSuccessfully,
            ),
        );
});

exports.getHotelsByCategoryId = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    // Check if the category exists
    const category = await Category.findById(categoryId);
    if (!category) {
        return res
            .status(404)
            .json(
                new ApiResponse(
                    404,
                    null,
                    responseMessage.userMessage.categoryNotFound,
                ),
            );
    }

    // Find hotels with the specified category ID in their category array
    const hotels = await Hotel.find({ category: { $in: [categoryId] } });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                hotels,
                responseMessage.userMessage.hotelFetchedSuccessfully,
            ),
        );
});

exports.getTopHotels = asyncHandler(async (req, res) => {
    const hotels = await Hotel.find({ isTop: 1 });
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                hotels,
                responseMessage.userMessage.topHotelsFetchedSuccessfully,
            ),
        );
});
