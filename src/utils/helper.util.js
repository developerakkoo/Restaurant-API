const Admin = require("../models/admin.model");
const User = require("../models/user.model");
const DeliveryBoy = require("../models/deliveryBoy.model");
const Partner = require("../models/partner.model");

const findUserByEmail = async (email) => {
    let user = await User.findOne({ email });
    if (user) return { user, model: "User" };

    user = await Admin.findOne({ email });
    if (user) return { user, model: "Admin" };

    user = await DeliveryBoy.findOne({ email });
    if (user) return { user, model: "DeliveryBoy" };

    user = await Partner.findOne({ email });
    if (user) return { user, model: "Partner" };

    return null;
};

module.exports = {
    findUserByEmail,
};
