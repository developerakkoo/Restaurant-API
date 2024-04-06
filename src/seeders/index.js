const { createUser } = require("./user.seed");
const {createPartner} = require('../seeders/partner.seed');
const  {createDeliveryBoy} = require('../seeders/deliveryBoy.seed');

module.exports = {
    createUser,
    createPartner,
    createDeliveryBoy
};
