const axios = require("axios");

const getDistance = async (userLat, userLon, shopLat, shopLon) => {
    const googleMapsApiKey = "AIzaSyADFvEEjDAljOg3u9nBd1154GIZwFWnono";
    const response = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json?` +
        `units=metric&` +
        `origins=${userLat},${userLon}&` +
        `destinations=${shopLat},${shopLon}&` +
        `key=${googleMapsApiKey}`,
    );
    const distanceInMeters =
        response.data.rows[0].elements[0].distance.value;
    return distanceInMeters / 1000; // Convert to kilometers
};

module.exports = { getDistance };
