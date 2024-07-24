const axios = require("axios");

const getDistance = async (userLat, userLon, shopLat, shopLon) => {
    const googleMapsApiKey = process.env.GOOGLE_MAP_API_KEY;
    try {
        const response = await axios.get(
            `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${userLat},${userLon}&destinations=${shopLat},${shopLon}&key=${googleMapsApiKey}`,
        );
        const distanceInMeters =
            response.data.rows[0].elements[0].distance.value;
        return distanceInMeters / 1000; // Convert to kilometers
    } catch (error) {
        console.log(error);
        throw new Error("Failed to calculate distance");
    }
};

module.exports = { getDistance };
