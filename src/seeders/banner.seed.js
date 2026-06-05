const Banner = require("../models/banner.model");
const fs = require("fs");
const path = require("path");
const { IMAGES_DIR, BANNER_TYPE_MAP } = require("./config/seed.config");
const {
    copySeedImage,
    placeholderImageFields,
} = require("./utils/imageHelper");

const createBanners = async (manifest, seedContext) => {
    const bannersDir = path.join(IMAGES_DIR, "banners");
    const mode = manifest.mode || "skip";
    const banners = [];

    if (mode === "replace") {
        await Banner.deleteMany({});
    }

    if (!fs.existsSync(bannersDir)) {
        console.warn(`⚠️  Banners directory not found: ${bannersDir}`);
        seedContext.banners = banners;
        return banners;
    }

    const files = fs.readdirSync(bannersDir);

    for (const [typeName, typeValue] of Object.entries(BANNER_TYPE_MAP)) {
        const matching = files.find((f) => {
            const base = path.basename(f, path.extname(f)).toLowerCase();
            return base === typeName;
        });

        if (!matching) {
            continue;
        }

        if (mode === "skip") {
            const existing = await Banner.findOne({ type: typeValue });
            if (existing) {
                banners.push(existing);
                continue;
            }
        }

        const sourcePath = path.join(bannersDir, matching);
        let imageFields = placeholderImageFields();
        const copied = copySeedImage(sourcePath);
        if (copied) {
            imageFields = {
                image_url: copied.image_url,
                local_imagePath: copied.local_imagePath,
            };
        }

        const banner = await Banner.create({
            type: typeValue,
            ...imageFields,
        });
        banners.push(banner);
    }

    console.log(`🌱 ${banners.length} banner(s) ready`);
    seedContext.banners = banners;
    return banners;
};

module.exports = { createBanners };
