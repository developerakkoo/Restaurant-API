const path = require("path");

const SEED_ENV = process.env.SEED_ENV || "local";
const SEED_RESET = process.env.SEED_RESET === "true";

const IMAGE_BASE = {
    local: process.env.LOCAL_IMAGE_BASE || "http://localhost:8000",
    production:
        process.env.PRODUCTION_IMAGE_BASE || "https://dropeat.techlapse.co.in",
};

const ROOT_DIR = path.join(__dirname, "..", "..", "..");
const SEED_DATA_DIR = path.join(ROOT_DIR, "seed-data");
const IMAGES_DIR = path.join(SEED_DATA_DIR, "images");
const UPLOAD_DIR = path.join(ROOT_DIR, "src", "upload");
const MANIFEST_PATH = path.join(SEED_DATA_DIR, "manifest.json");

const IMAGE_EXTENSIONS = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".bmp",
]);

const BANNER_TYPE_MAP = {
    home: 0,
    cart: 1,
    fav: 2,
    profile: 3,
};

function getImageBaseUrl() {
    const base = IMAGE_BASE[SEED_ENV];
    if (!base) {
        throw new Error(
            `Invalid SEED_ENV "${SEED_ENV}". Use "local" or "production".`,
        );
    }
    return base.replace(/\/$/, "");
}

function buildImageFields(filename) {
    const base = getImageBaseUrl();
    return {
        image_url: `${base}/upload/${filename}`,
        local_imagePath: `upload/${filename}`,
    };
}

function buildProfileFields(filename) {
    const base = getImageBaseUrl();
    return {
        profile_image: `${base}/upload/${filename}`,
        local_profileImagePath: `upload/${filename}`,
    };
}

function slugToTitle(slug) {
    return slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function titleCaseFromFilename(filename) {
    return filename
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

module.exports = {
    SEED_ENV,
    SEED_RESET,
    IMAGE_BASE,
    ROOT_DIR,
    SEED_DATA_DIR,
    IMAGES_DIR,
    UPLOAD_DIR,
    MANIFEST_PATH,
    IMAGE_EXTENSIONS,
    BANNER_TYPE_MAP,
    getImageBaseUrl,
    buildImageFields,
    buildProfileFields,
    slugToTitle,
    titleCaseFromFilename,
};
