const bannerModel = require("../models/banner.model");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { deleteFile } = require("../utils/deleteFile");
const { responseMessage } = require("../constant");
const { ApiError } = require("../utils/ApiErrorHandler");

exports.addBanner = asyncHandler(async (req, res) => {
    const { type } = req.body;
    // console.log(req.file);
    const { filename } = req.file;
    const local_filePath = `upload/${filename}`;
    let image_url = `https://${req.hostname}/upload/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        image_url = `https://${req.hostname}:8000/upload/${filename}`;
    }
    const savedBanner = await bannerModel.findById(hotelId);
    if (savedBanner) {
        deleteFile(savedBanner?.local_imagePath);
    }
    const data = {
        type,
        image_url,
        local_imagePath: local_filePath,
    };

    // if (req.body.redirect_url) data.redirect_url = req.body.redirect_url;
    const banner = await bannerModel.create(data);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                banner,
                responseMessage.adminMessage.bannerAdded,
            ),
        );
});

exports.updateBanner = asyncHandler(async (req, res) => {
    const { type } = req.body;
    const updatedBanner = await bannerModel.findByIdAndUpdate(
        req.params.bannerId,
        {
            $set: {
                type,
            },
        },
        {
            new: true,
        },
    );
    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedBanner, "Banner updated successfully"),
        );
});

exports.updateBannerImage = asyncHandler(async (req, res) => {
    const { bannerId } = req.body;
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
    const bannerImage = await bannerModel.findByIdAndUpdate(
        bannerId,
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
                bannerImage,
                responseMessage.adminMessage.bannerUpdated,
            ),
        );
});

exports.deleteBanner = asyncHandler(async (req, res) => {
    const { bannerId } = req.params;
    const banner = await bannerModel.findByIdAndDelete(bannerId);
    if (!banner?.local_imagePath) {
        throw new ApiError(404, "Banner Nor Found");
    }
    deleteFile(banner?.local_imagePath);
    return res
        .status(200)
        .json(new ApiResponse(200, "ok", "Banner Deleted Successfully"));
});

exports.getBanner = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const dataCount = await bannerModel.countDocuments();
    const banner = await bannerModel.find({ type }).skip(skip).limit(pageSize);
    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + banner.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                content: banner,
                startItem,
                endItem,
                totalPages,
                pagesize: banner.length,
                totalDoc: dataCount,
            },
            responseMessage.adminMessage.bannerFetchedSuccessfully,
        ),
    );
});
