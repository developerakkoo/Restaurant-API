const Cart = require("../models/cart.model");
const dishModel = require("../models/hotelDish.model");
const { ApiResponse } = require("../utils/ApiResponseHandler");
const { asyncHandler } = require("../utils/asyncHandler");
const { responseMessage } = require("../constant");

exports.updateCart = asyncHandler(async (req, res) => {
    const { userId, hotelId, products } = req.body;

    // Check if hotelId is provided
    if (!hotelId) {
        return res
            .status(400)
            .json(new ApiResponse(400, null, "Hotel ID is required"));
    }

    // Retrieve the existing cart
    let cart = await Cart.findOne({ userId });

    // Check if cart exists and hotelId does not match
    if (
        cart &&
        cart.hotelId &&
        cart.hotelId.toString() !== hotelId.toString()
    ) {
        // Clear the products in the cart if hotelId does not match
        cart.products = [];
        cart.hotelId = hotelId;
    }

    // Create a new cart if it doesn't exist
    if (!cart) {
        cart = new Cart({ userId, products: [], hotelId });
    } else {
        // Update the hotelId if it was null
        if (!cart.hotelId) {
            cart.hotelId = hotelId;
        }
    }

    // Update quantities and add new products
    for (const product of products) {
        const dish = await dishModel.findById(product.dishId);

        if (!dish) {
            return res
                .status(400)
                .json(
                    new ApiResponse(
                        400,
                        null,
                        `Dish with ID ${product.dishId} not found`,
                    ),
                );
        }

        // Check if the dish already exists in the cart
        const existingProduct = cart.products.find(
            (p) => p.dishId.toString() === product.dishId.toString(),
        );

        if (existingProduct) {
            // Update the quantity of the existing dish
            existingProduct.quantity += product.quantity;
        } else {
            // Add the new dish to the cart
            cart.products.push({
                dishId: product.dishId,
                quantity: product.quantity,
            });
        }
    }

    // Recalculate total price
    let totalPrice = 0;
    for (const product of cart.products) {
        const dish = await dishModel.findById(product.dishId);
        if (dish) {
            totalPrice += dish.userPrice * product.quantity;
        }
    }

    // Update the total price in the cart
    cart.totalPrice = totalPrice;

    // Save the updated cart
    const updatedCart = await cart.save();

    res.status(200).json(
        new ApiResponse(
            200,
            updatedCart,
            responseMessage.userMessage.cartUpdatedSuccessfully,
        ),
    );
});

exports.deleteProductFromCart = asyncHandler(async (req, res) => {
    const { userId, dishId, quantityToRemove = 1 } = req.body;

    // Find the cart for the user
    const cart = await Cart.findOne({ userId: userId });

    if (!cart) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Cart not found"));
    }

    // Update the quantity or remove the product from the cart
    const updatedProducts = cart.products
        .map((product) => {
            if (product.dishId.toString() === dishId) {
                product.quantity -= quantityToRemove;
                if (product.quantity <= 0) {
                    return null; // Mark for removal
                }
            }
            return product;
        })
        .filter((product) => product !== null); // Remove null entries

    // Recalculate the total price
    let totalPrice = 0;
    for (const product of updatedProducts) {
        const dish = await dishModel.findById(product.dishId);
        if (dish) {
            totalPrice += dish.userPrice * product.quantity;
        }
    }

    // Update the cart with the new products and total price
    cart.products = updatedProducts;
    cart.totalPrice = totalPrice;

    // Save the updated cart
    const updatedCart = await cart.save();
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
    const cart = await Cart.findOne({ userId }).populate({path:"hotelId",select:"location"}).populate({
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

exports.clearCart = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const cart = await Cart.findOneAndUpdate(
        { userId: userId },
        { $set: { products: [], totalPrice: 0 } },
        { new: true },
    );
    if (!cart) {
        return res
            .status(404)
            .json(new ApiResponse(404, null, "Cart not found"));
    }
    res.status(200).json(
        new ApiResponse(
            200,
            cart,
            responseMessage.userMessage.cartClearedSuccessfully,
        ),
    );
});
