const {
  extractPincodeFromGeocodeResult,
  geocodeStatusMessage,
} = require("../src/utils/geocoding.util");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const result = {
  formatted_address: "Some Street, Mumbai, Maharashtra, India",
  address_components: [
    { long_name: "400612", types: ["postal_code"] },
  ],
};

assert(
  extractPincodeFromGeocodeResult(result) === "400612",
  "postal_code component"
);
assert(
  extractPincodeFromGeocodeResult({
    formatted_address: "Test 411014 area",
    address_components: [],
  }) === "411014",
  "formatted_address fallback"
);
assert(
  geocodeStatusMessage("REQUEST_DENIED") === "Geocoding service misconfigured",
  "REQUEST_DENIED message"
);

console.log("geocoding.util tests passed");
