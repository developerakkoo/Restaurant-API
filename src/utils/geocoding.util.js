function getGeocodingApiKey() {
    return (
        process.env.GOOGLE_MAPS_API_KEY ||
        process.env.GOOGLE_MAP_API_KEY ||
        ""
    );
}

function extractPincodeFromGeocodeResult(result) {
    if (!result) {
        return null;
    }

    const components = result.address_components || [];
    for (const component of components) {
        if (component.types?.includes("postal_code")) {
            const match = String(component.long_name || "").match(/\b\d{6}\b/);
            if (match) {
                return match[0];
            }
        }
    }

    const formattedAddress = result.formatted_address || "";
    const pincodeMatch = formattedAddress.match(/\b\d{6}\b/);
    return pincodeMatch ? pincodeMatch[0] : null;
}

function geocodeStatusMessage(status) {
    switch (status) {
        case "REQUEST_DENIED":
            return "Geocoding service misconfigured";
        case "ZERO_RESULTS":
            return "No address found for this location";
        case "OVER_QUERY_LIMIT":
            return "Address service temporarily unavailable";
        case "INVALID_REQUEST":
            return "Invalid location coordinates";
        default:
            return "Could not resolve address";
    }
}

module.exports = {
    getGeocodingApiKey,
    extractPincodeFromGeocodeResult,
    geocodeStatusMessage,
};
