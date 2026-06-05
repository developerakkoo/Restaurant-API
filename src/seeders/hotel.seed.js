const Hotel = require("../models/hotel.model");
const { faker } = require("@faker-js/faker");
const path = require("path");
const { IMAGES_DIR } = require("./config/seed.config");
const {
    findFirstImageInDir,
    copySeedImage,
    placeholderImageFields,
} = require("./utils/imageHelper");

const createHotels = async (manifest, seedContext) => {
    const partners = seedContext.partners || [];
    const categories = seedContext.categories || [];
    const hotelsPerPartner = manifest.counts?.hotelsPerPartner ?? 1;
    const location = manifest.location || {
        lat: 18.5204,
        lng: 73.8567,
        city: "Pune",
    };
    const hotelsDir = path.join(IMAGES_DIR, "hotels");
    const categoryIds = categories.map((c) => c._id);

    const hotels = [];
    let hotelIndex = 0;

    for (const partner of partners) {
        if (mode === "skip") {
            const existingHotels = await Hotel.find({ userId: partner._id });
            if (existingHotels.length >= hotelsPerPartner) {
                hotels.push(...existingHotels.slice(0, hotelsPerPartner));
                hotelIndex += hotelsPerPartner;
                continue;
            }
        }

        for (let h = 0; h < hotelsPerPartner; h++) {
            const hotelName = `${faker.company.name()} ${location.city}`;

            const hotelImagePath = findFirstImageInDir(
                hotelsDir,
                String(hotelIndex + 1).padStart(2, "0"),
            );

            let imageFields = placeholderImageFields();
            if (hotelImagePath) {
                const copied = copySeedImage(hotelImagePath);
                if (copied) {
                    imageFields = {
                        image_url: copied.image_url,
                        local_imagePath: copied.local_imagePath,
                    };
                }
            } else {
                console.warn(
                    `⚠️  No hotel image for index ${hotelIndex + 1} — using placeholder`,
                );
            }

            const lngOffset = (Math.random() - 0.5) * 0.05;
            const latOffset = (Math.random() - 0.5) * 0.05;

            const hotel = await Hotel.create({
                userId: partner._id,
                category: categoryIds,
                hotelName,
                address: `${faker.location.streetAddress()}, ${location.city}`,
                location: {
                    type: "Point",
                    coordinates: [
                        location.lng + lngOffset,
                        location.lat + latOffset,
                    ],
                },
                ...imageFields,
                isTop: hotelIndex % 3 === 0 ? 1 : 0,
                hotelStatus: 2,
                isOnline: true,
            });

            hotels.push(hotel);
            hotelIndex++;
        }
    }

    console.log(`🌱 ${hotels.length} hotel(s) ready`);
    seedContext.hotels = hotels;
    return hotels;
};

module.exports = { createHotels };
