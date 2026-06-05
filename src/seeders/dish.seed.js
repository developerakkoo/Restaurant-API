const HotelDish = require("../models/hotelDish.model");
const { faker } = require("@faker-js/faker");
const path = require("path");
const { IMAGES_DIR, titleCaseFromFilename } = require("./config/seed.config");
const {
    listImageFiles,
    readJsonSidecar,
    copySeedImage,
    placeholderImageFields,
} = require("./utils/imageHelper");

const createDishes = async (manifest, seedContext) => {
    const categories = seedContext.categories || [];
    const hotels = seedContext.hotels || [];
    const categoriesDir = path.join(IMAGES_DIR, "categories");
    const mode = manifest.mode || "skip";

    if (mode === "replace" && hotels.length) {
        const hotelIds = hotels.map((h) => h._id);
        await HotelDish.deleteMany({ hotelId: { $in: hotelIds } });
    }

    const dishes = [];
    let hotelRoundRobin = 0;

    for (const category of categories) {
        const slug = category.slug;
        const dishesDir = path.join(categoriesDir, slug, "dishes");
        const imageFiles = listImageFiles(dishesDir);

        if (!imageFiles.length) {
            console.warn(
                `⚠️  No dish images for category "${category.name}" — ${dishesDir}`,
            );
            continue;
        }

        for (const imagePath of imageFiles) {
            const baseName = path.basename(imagePath, path.extname(imagePath));
            const sidecar = readJsonSidecar(imagePath) || {};

            const partnerPrice =
                sidecar.partnerPrice ??
                faker.number.int({ min: 80, max: 350 });
            const userPrice =
                sidecar.userPrice ??
                Math.round(partnerPrice * 1.25);

            let imageFields = placeholderImageFields();
            const copied = copySeedImage(imagePath);
            if (copied) {
                imageFields = {
                    image_url: copied.image_url,
                    local_imagePath: copied.local_imagePath,
                };
            }

            const hotel = hotels[hotelRoundRobin % hotels.length];
            hotelRoundRobin++;

            const dish = await HotelDish.create({
                hotelId: hotel._id,
                categoryId: category._id,
                name: sidecar.name || titleCaseFromFilename(baseName),
                dishType: sidecar.dishType || "veg",
                partnerPrice,
                userPrice,
                spicLevel: sidecar.spicLevel ?? 0,
                timeToPrepare: sidecar.timeToPrepare ?? 20,
                stock: sidecar.stock ?? 1,
                status: sidecar.status ?? 2,
                ...imageFields,
            });

            dishes.push(dish);
        }
    }

    console.log(`🌱 ${dishes.length} dish(es) ready`);
    seedContext.dishes = dishes;
    return dishes;
};

module.exports = { createDishes };
