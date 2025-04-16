const axios = require("axios");

const toRadians = (degrees) => degrees * (Math.PI / 180);

//This method is for calculating the distance between two coordinates using the Haversine formula
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return distance; // in kilometers
};

//THis method is for calculating the distance between two coordinates using the Google Maps API
// const getDistance = async (userLat, userLon, shopLat, shopLon) => {
//     const googleMapsApiKey = "AIzaSyADFvEEjDAljOg3u9nBd1154GIZwFWnono";
//     const response = await axios.get(
//         `https://maps.googleapis.com/maps/api/distancematrix/json?` +
//         `units=metric&` +
//         `origins=${userLat},${userLon}&` +
//         `destinations=${shopLat},${shopLon}&` +
//         `key=${googleMapsApiKey}`,
//     );
//     const distanceInMeters =
//     response.data.rows[0].elements[0].distance.value;;
            
//           return distanceInMeters / 1000; // Convert to kilometers
// };

// getDistance(
//     "28.7041",
//     "77.1025",
//     "19.076",
//     "72.8777",
// )
//     .then((distance) => {
//         console.log("Distance in kilometers:", distance);
//     })
//     .catch((error) => {
//         console.error("Error fetching distance:", error);
//     });

module.exports = { getDistance };
