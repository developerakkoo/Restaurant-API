const DeliveryBoy = require("../models/deliveryBoy.model");

const buildDriverStatusPayload = (driver, isOnline) => ({
    userId: driver._id.toString(),
    userType: 3,
    isOnline,
    lastSeen: driver.lastSeen || new Date(),
    firstName: driver.firstName,
    lastName: driver.lastName,
    phoneNumber: driver.phoneNumber,
});

const emitDriverStatusChange = (io, driver, isOnline) => {
    if (!io || !driver) {
        return;
    }

    const payload = buildDriverStatusPayload(driver, isOnline);
    io.emit("userStatusChanged", payload);
    io.to("admin_dashboard").emit("userStatusChanged", payload);
};

const setDriverOffline = async (userId, io) => {
    const driver = await DeliveryBoy.findByIdAndUpdate(
        userId,
        { $set: { isOnline: false, lastSeen: new Date() } },
        { new: true }
    ).select("firstName lastName phoneNumber isOnline lastSeen");

    if (driver && io) {
        emitDriverStatusChange(io, driver, false);
    }

    return driver;
};

module.exports = {
    buildDriverStatusPayload,
    emitDriverStatusChange,
    setDriverOffline,
};
