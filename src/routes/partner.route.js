const router = require("express").Router();
const partnerController = require('../controller/partner.controller');
const authController = require('../controller/auth.controller');


router.post("/logout", authController.logoutUser);


module.exports = { partnerRoutes: router };
