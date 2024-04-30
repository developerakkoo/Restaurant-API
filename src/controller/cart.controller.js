const Cart = require("../models/cart.model");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { responseMessage } = require("../constant");

exports.updateCart = asyncHandler(async (req, res) => {
    const { userId, products, totalPrice } = req.body;
    // const cart = await Cart.findOne({ userId });
    const updatedCart = await Cart.findOneAndUpdate(
        { userId: userId },
        { $set: { products, totalPrice } },
        { new: true },
    );
    res.status(200).json(
        new ApiResponse(
            200,
            updatedCart,
            responseMessage.userMessage.cartUpdatedSuccessfully,
        ),
    );
});

exports.deleteProductFromCart = asyncHandler(async (req, res) => {
    const { userId, dishId, totalPrice } = req.body;
    const updatedCart = await Cart.findOneAndUpdate(
        { userId: userId, "products.dishId": dishId },
        {
            $pull: {
                products: { dishId: dishId },
            },
            $set: { totalPrice: totalPrice },
        },
        { new: true },
    );
    res.status(200).json(
        new ApiResponse(
            200,
            updatedCart,
            responseMessage.userMessage.deleteProductFromCartDeletedSuccessfully,
        ),
    );
});

exports.getMyCart = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const cart = await Cart.findOne({ userId }).populate({
        path: "products.dishId",
        select: "-partnerPrice",
    });

    res.status(200).json(
        new ApiResponse(
            200,
            cart,
            responseMessage.userMessage.cartFetchedSuccessfully,
        ),
    );
});

exports.getCartById = asyncHandler(async (req, res) => {
    const { cartId } = req.params;
    const cart = await Cart.findById(cartId).populate({
        path: "products.dishId",
        select: "-partnerPrice",
    });
    res.status(200).json(
        new ApiResponse(
            200,
            cart,
            responseMessage.userMessage.cartFetchedSuccessfully,
        ),
    );
});
