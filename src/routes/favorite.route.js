const router = require("express").Router();
const favoriteController = require("../controller/favorite.controller");

router.post("/add-favorite", favoriteController.addFavorite);

router.get("/get-favorite/:id", favoriteController.getFavorite);

router.get("/getMy/favorites/:userId", favoriteController.getMyFavoritesList);

router.delete("/remove/favorite", favoriteController.removeFavorite);

module.exports = { favoriteRoutes: router };
