const fs = require("fs");
const path = require("path");
const {
    UPLOAD_DIR,
    IMAGE_EXTENSIONS,
    buildImageFields,
    buildProfileFields,
} = require("../config/seed.config");

function ensureUploadDir() {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
}

function generateUploadFilename(sourcePath) {
    const ext = path.extname(sourcePath).toLowerCase() || ".jpg";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    return uniqueSuffix + ext;
}

/**
 * Copy a seed image into src/upload/ with Multer-style naming.
 * @returns {{ filename: string, image_url: string, local_imagePath: string } | null}
 */
function copySeedImage(sourcePath) {
    if (!sourcePath || !fs.existsSync(sourcePath)) {
        return null;
    }

    ensureUploadDir();
    const filename = generateUploadFilename(sourcePath);
    const destPath = path.join(UPLOAD_DIR, filename);
    fs.copyFileSync(sourcePath, destPath);

    return {
        filename,
        ...buildImageFields(filename),
    };
}

/**
 * Copy profile image; returns profile_image + local_profileImagePath fields.
 */
function copyProfileImage(sourcePath) {
    const result = copySeedImage(sourcePath);
    if (!result) {
        return null;
    }
    return buildProfileFields(result.filename);
}

function findFirstImageInDir(dirPath, basename) {
    if (!fs.existsSync(dirPath)) {
        return null;
    }

    for (const ext of IMAGE_EXTENSIONS) {
        const candidate = path.join(dirPath, basename + ext);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

function listImageFiles(dirPath) {
    if (!fs.existsSync(dirPath)) {
        return [];
    }

    return fs
        .readdirSync(dirPath)
        .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
        .sort()
        .map((file) => path.join(dirPath, file));
}

function readJsonSidecar(imagePath) {
    const sidecarPath =
        imagePath.replace(/\.[^.]+$/, "") + ".json";
    if (!fs.existsSync(sidecarPath)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    } catch {
        console.warn(`⚠️  Invalid JSON sidecar: ${sidecarPath}`);
        return null;
    }
}

function getProfileImagePath(profilesDir, index) {
    const padded = String(index + 1).padStart(2, "0");
    return findFirstImageInDir(profilesDir, padded);
}

function placeholderImageFields() {
    return {
        image_url: "_",
        local_imagePath: "_",
    };
}

function placeholderProfileFields() {
    return {
        profile_image: "_",
        local_profileImagePath: "_",
    };
}

module.exports = {
    ensureUploadDir,
    copySeedImage,
    copyProfileImage,
    findFirstImageInDir,
    listImageFiles,
    readJsonSidecar,
    getProfileImagePath,
    placeholderImageFields,
    placeholderProfileFields,
};
