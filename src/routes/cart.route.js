const router = require("express").Router();
const cartController = require("../controller/cart.controller");

router.post("/add-to-cart", cartController.updateCart);

router.get("/get-cart/:userId", cartController.getMyCart);

router.get("/get-cart/byId/:cartId", cartController.getCartById);

router.delete("/delete/product", cartController.deleteProductFromCart);

module.exports = { cartRoutes: router };
