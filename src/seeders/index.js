const { createAdmin } = require("./admin.seed");
const { createPlatform } = require("./platform.seed");
const { createCategories } = require("./category.seed");
const { createPartners } = require("./partner.seed");
const { createHotels } = require("./hotel.seed");
const { createDishes } = require("./dish.seed");
const { createUsers } = require("./user.seed");
const { createDeliveryBoys } = require("./deliveryBoy.seed");
const { createBanners } = require("./banner.seed");

module.exports = {
    createAdmin,
    createPlatform,
    createCategories,
    createPartners,
    createHotels,
    createDishes,
    createUsers,
    createDeliveryBoys,
    createBanners,
};
