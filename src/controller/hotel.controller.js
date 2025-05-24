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
const Rating = require("../models/rating.model");
const HotelOffer = require("../models/hotelOffer.model");

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
        status,
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
        status
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
        document_url = `https://${req.hostname}/upload/${filename}`;
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
    const images = req.files
        ? req.files.map(
              (file) => `https://${req.hostname}/upload/${file.filename}`,
          )
        : [];
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
        images,
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
                                isOnline:1
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
        )
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

exports.getDishByHotelId = asyncHandler(async (req, res) => {
    const { q, status, categoryId, dishType, stock } = req.query;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;
    const { hotelId } = req.params;
    let dbQuery = { hotelId };

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

    // Sort by stock
    if (stock) {
        dbQuery.stock = stock;
    }

    // Sort by dishType
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

    // Count total documents
    const totalDishes = await Dish.countDocuments(dbQuery);

    // Fetch paginated documents
    const dishes = await Dish.find(dbQuery)
        .populate("hotelId")
        .populate("categoryId")
        .skip(skip)
        .limit(pageSize);

    const totalPages = Math.ceil(totalDishes / pageSize);
    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + dishes.length - 1,
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                content: dishes,
                startItem,
                endItem,
                totalPages,
                pagesize: dishes.length,
                totalDoc: totalDishes,
            },
            responseMessage.userMessage.dishFetchedSuccessfully,
        ),
    );
});

exports.getHotelsAndDishes = asyncHandler(async (req, res) => {
    let dishPipeline = [
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
                avgRating: { $avg: "$dishStars.star" }, // Calculate average rating
            },
        },
        {
            $project: {
                _id: "$_id._id",
                dishName: "$_id.dishName",
                image_url: "$_id.image_url",
                dishType: "$_id.dishType",
                partnerPrice: "$_id.partnerPrice",
                userPrice: "$_id.userPrice",
                spicLevel: "$_id.spicLevel",
                stock: "$_id.stock",
                status: "$_id.status",
                hotelDetails: "$_id.hotelDetails",
                categoryDetails: "$_id.categoryDetails",
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
                                    $ifNull: ["$$star.user.profile_image", ""],
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
                avgRating: "$avgRating", // Include average rating
                isHotel: { $literal: false }, // Set isHotel to false for dishes
            },
        },
    ];

    let hotelPipeline = [
        {
            $lookup: {
                as: "categoryDetails",
                from: "categories",
                foreignField: "_id",
                localField: "category",
                pipeline: [
                    {
                        $project: {
                            name: 1,
                            image_url: 1,
                            local_imagePath: 1,
                        },
                    },
                ],
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
            $lookup: {
                as: "hotelstars",
                from: "hotelstars",
                foreignField: "hotelId",
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
                    {
                        $unwind: "$user",
                    },
                ],
            },
        },
        {
            $unwind: "$hotelstars",
        },
        {
            $group: {
                _id: {
                    hotelId: "$_id",
                    hotelName: "$hotelName",
                    image_url: "$image_url",
                    address: "$address",
                    hotelOwner: "$hotelOwner",
                    categoryDetails: "$categoryDetails",
                },
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
                starData: { $push: "$hotelstars" },
                avgRating: { $avg: "$hotelstars.star" }, // Calculate average rating
            },
        },
        {
            $project: {
                _id: 0,
                hotelId: "$_id.hotelId",
                hotelName: "$_id.hotelName",
                image_url: "$_id.image_url",
                address: "$_id.address",
                categoryDetails: "$_id.categoryDetails",
                starCounts: {
                    "1starCount": "$1starCount",
                    "2starCount": "$2starCount",
                    "3starCount": "$3starCount",
                    "4starCount": "$4starCount",
                    "5starCount": "$5starCount",
                    totalCount: "$totalCount",
                },
                hotelOwner: "$_id.hotelOwner",
                ratingData: {
                    $map: {
                        input: "$starData",
                        as: "star",
                        in: {
                            _id: "$$star._id",
                            hotelId: "$$star.hotelId",
                            userId: "$$star.userId",
                            description: "$$star.description",
                            star: "$$star.star",
                            createdAt: "$$star.createdAt",
                            updatedAt: "$$star.updatedAt",
                            user: "$$star.user",
                        },
                    },
                },
                avgRating: "$avgRating", // Include average rating
                isHotel: { $literal: true }, // Set isHotel to true for hotels
            },
        },
    ];

    let dishes = await Dish.aggregate(dishPipeline);
    let hotels = await Hotel.aggregate(hotelPipeline);

    res.json([...hotels, ...dishes]);
});

exports.bulkDishCreate = asyncHandler(async (req, res) => {
    const { dishes } = req.body;
    if (!Array.isArray(dishes) || dishes.length === 0) {
        return res
            .status(400)
            .json(new ApiResponse(400, null, "Invalid dishes array"));
    }
    const bulkDishOperations = await Dish.insertMany(dishes);

    res.status(201).json(
        new ApiResponse(201, bulkDishOperations, "Dishes created successfully"),
    );
});

const axios = require("axios");

exports.getHotelsNearby = asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    null,
                    "Latitude and Longitude are required",
                ),
            );
    }

    // Fetch all hotels and count the total number
    const [hotels, dataCount] = await Promise.all([
        Hotel.find().lean(), // Consider adding a geospatial filter here if needed
        Hotel.countDocuments(),
    ]);

    if (hotels.length === 0) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Hotels not found"));
    }

    // Calculate road distances
    const apiKey = process.env.GOOGLE_MAP_API_KEY; // Replace with your Google Maps API key
    const origins = [`${latitude},${longitude}`];
    const destinations = hotels.map(
        (hotel) =>
            `${hotel.location?.coordinates[1]},${hotel.location?.coordinates[0]}`,
    );

    // Check if destinations are valid
    if (destinations.length === 0) {
        return res
            .status(500)
            .json(new ApiResponse(500, null, "No destinations found"));
    }

    const response = await axios.get(
        "https://maps.googleapis.com/maps/api/distancematrix/json",
        {
            params: {
                origins: origins.join("|"),
                destinations: destinations.join("|"),
                key: apiKey,
            },
        },
    );

    const distanceMatrix = response.data;

    // Ensure correct structure of the distance matrix
    if (
        !distanceMatrix ||
        !distanceMatrix.rows ||
        !distanceMatrix.rows[0].elements
    ) {
        return res
            .status(500)
            .json(
                new ApiResponse(500, null, "Invalid distance matrix response"),
            );
    }

    // Add road distance to each hotel
    hotels.forEach((hotel, index) => {
        const element = distanceMatrix.rows[0].elements[index];
        if (element && element.distance) {
            hotel.distance = `${(element.distance.value * 0.001).toFixed(2)} km`; // Convert meters to kilometers
        } else {
            hotel.distance = "N/A"; // Handle case where distance is not available
        }
    });

    // Sort hotels by distance (nearest first)
    hotels.sort((a, b) => {
        return (
            (parseFloat(a.distance) || Infinity) -
            (parseFloat(b.distance) || Infinity)
        );
    });

    // Send the final response
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                content: hotels,
                totalCount: dataCount, // Include total count of hotels
            },
            "Hotels fetched successfully",
        ),
    );
});

/**
 * Get all hotels with their ratings
 * @route GET /api/hotel/with-ratings
 * @access Public
 */
exports.getAllHotelsWithRatings = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const currentDate = new Date();

    // Get all hotels with pagination
    const hotels = await Hotel.find({ }) // Only get approved hotels
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate({
            path: "category",
            select: "name image_url _id",
            limit: 3 // Limit to 3 categories
        })
        .populate("userId", "name profile_image");

    // Get ratings for each hotel
    const hotelsWithRatings = await Promise.all(
        hotels.map(async (hotel) => {
            // Get average ratings for the hotel
            const ratings = await Rating.aggregate([
                { $match: { hotelId: hotel._id, status: "active" } },
                {
                    $group: {
                        _id: null,
                        avgFoodRating: { $avg: "$foodRating" },
                        avgRestaurantRating: { $avg: "$restaurantRating" },
                        totalRatings: { $sum: 1 },
                    },
                },
            ]);

            // Get the latest reviews
            const latestReviews = await Rating.find({ hotelId: hotel._id, status: "active" })
                .sort({ createdAt: -1 })
                .limit(3)
                .populate("userId", "name profile_image");

            // Calculate average price of dishes
            const avgPrice = await Dish.aggregate([
                { $match: { hotelId: hotel._id, status: 2 } }, // Only approved dishes
                {
                    $group: {
                        _id: null,
                        avgPrice: { $avg: "$userPrice" }
                    }
                }
            ]);

            // Get active offers for the hotel
            const activeOffers = await HotelOffer.find({
                hotelId: hotel._id,
                isActive: true,
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate },
            }).sort({ offerValue: -1 }); // Sort by offer value to get the best offer first

            // Get the best offer
            const bestOffer = activeOffers.length > 0 ? {
                type: activeOffers[0].offerType,
                value: activeOffers[0].offerValue,
                minOrderAmount: activeOffers[0].minOrderAmount,
                maxDiscount: activeOffers[0].maxDiscount,
                description: activeOffers[0].description,
                endDate: activeOffers[0].endDate
            } : null;

            // Get dish ratings
            const dishRatings = await Rating.aggregate([
                { $match: { hotelId: hotel._id, status: "active" } },
                {
                    $lookup: {
                        from: "hoteldishes",
                        localField: "dishId",
                        foreignField: "_id",
                        as: "dishDetails"
                    }
                },
                { $unwind: "$dishDetails" },
                {
                    $group: {
                        _id: "$dishId",
                        dishName: { $first: "$dishDetails.name" },
                        avgRating: { $avg: "$foodRating" },
                        totalRatings: { $sum: 1 },
                        reviews: {
                            $push: {
                                rating: "$foodRating",
                                review: "$review",
                                userId: "$userId",
                                createdAt: "$createdAt"
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        dishName: 1,
                        avgRating: { $round: ["$avgRating", 1] },
                        totalRatings: 1,
                        reviews: { $slice: ["$reviews", 3] } // Get only 3 latest reviews
                    }
                }
            ]);

            return {
                ...hotel.toObject(),
                coordinates: hotel.location?.coordinates ? {
                    latitude: hotel.location.coordinates[1],
                    longitude: hotel.location.coordinates[0]
                } : null,
                ratings: ratings[0] || {
                    avgFoodRating: 0,
                    avgRestaurantRating: 0,
                    totalRatings: 0,
                },
                latestReviews,
                avgPrice: avgPrice[0]?.avgPrice ? Math.round(avgPrice[0].avgPrice) : 0,
                bestOffer,
                dishRatings // Include dish ratings in the response
            };
        })
    );

    // Get total count of hotels
    const totalHotels = await Hotel.countDocuments({ hotelStatus: 1 });

    return res.status(200).json(
        new ApiResponse(200, {
            hotels: hotelsWithRatings,
            pagination: {
                total: totalHotels,
                page: parseInt(page),
                pages: Math.ceil(totalHotels / limit),
            },
        }, "Hotels retrieved successfully with ratings")
    );
});
