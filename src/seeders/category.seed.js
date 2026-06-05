const Category = require("../models/category.model");
const path = require("path");
const { IMAGES_DIR } = require("./config/seed.config");
const {
    findFirstImageInDir,
    copySeedImage,
    placeholderImageFields,
} = require("./utils/imageHelper");

const createCategories = async (manifest, seedContext) => {
    const categoryDefs = manifest.categories || [];
    const categoriesDir = path.join(IMAGES_DIR, "categories");
    const mode = manifest.mode || "skip";
    const categories = [];

    for (const def of categoryDefs) {
        const slug = def.slug;
        const name = def.name || slug;

        if (mode === "skip") {
            const existing = await Category.findOne({ name });
            if (existing) {
                categories.push({
                    ...existing.toObject(),
                    slug,
                });
                continue;
            }
        }

        const categoryDir = path.join(categoriesDir, slug);
        const categoryImagePath = findFirstImageInDir(categoryDir, "category");

        let imageFields = placeholderImageFields();
        if (categoryImagePath) {
            const copied = copySeedImage(categoryImagePath);
            if (copied) {
                imageFields = {
                    image_url: copied.image_url,
                    local_imagePath: copied.local_imagePath,
                };
            }
        } else {
            console.warn(
                `⚠️  No category image for "${name}" — expected ${categoryDir}/category.{jpg|png|webp}`,
            );
        }

        const category = await Category.create({
            name,
            ...imageFields,
        });

        categories.push({ ...category.toObject(), slug });
    }

    console.log(`🌱 ${categories.length} categor(ies) ready`);
    seedContext.categories = categories;
    return categories;
};

module.exports = { createCategories };
