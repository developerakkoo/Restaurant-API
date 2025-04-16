const toRadians = (degrees) => degrees * (Math.PI / 180);

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

// Example usage:
const dist = getDistance(28.7041, 77.1025, 19.076, 72.8777);
console.log("Distance in KM:", dist.toFixed(2));