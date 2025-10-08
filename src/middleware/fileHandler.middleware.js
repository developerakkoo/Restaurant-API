const multer = require("multer");
const path = require("path");

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "..", "upload")); // Specify the directory where uploaded files will be saved
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Rename file with unique timestamp + original extension
    },
});

exports.upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // Allows files up to 100MB
    },
    fileFilter: function (req, file, cb) {
        // Allow all image types and common file formats
        const allowedTypes = [
            "image/jpeg", 
            "image/png", 
            "image/jpg", 
            "image/gif",
            "image/webp",
            "image/svg+xml",
            "image/bmp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("File type not supported. Allowed: images (JPEG, PNG, JPG, GIF, WebP, SVG, BMP), PDF, Word, Excel."));
        }
    },
});

exports.videoUpload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // Allows files up to 100MB
    },
    fileFilter: function (req, file, cb) {
        // Validate file types
        const allowedTypes = [
            "video/mp4",
            "video/webm",
            "video/ogg",
            "video/x-matroska", // for .mkv files
            "video/quicktime", // for .mov files
            "video/x-msvideo", // for .avi files
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Video type not supported. Allowed: MP4, WebM, OGG, MKV, MOV, AVI."));
        }
    },
});

// const multer = require("multer");
// const multerS3 = require("multer-s3");
// const aws = require("aws-sdk");
// const uuid = require("uuid");

// const s3 = new aws.S3({
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     region: "your-aws-region",
// });

// const upload = multer({
//     storage: multerS3({
//         s3: s3,
//         bucket: "your-bucket-name",
//         acl: "public-read", // Access control
//         key: function (req, file, cb) {
//             const ext = file.originalname.split(".").pop();
//             cb(null, `${uuid.v4()}.${ext}`); // Use UUID to generate unique file names
//         },
//     }),
//     limits: {
//         fileSize: 1024 * 1024 * 10, // Limit file size to 10MB
//     },
//     fileFilter: function (req, file, cb) {
//         if (
//             file.mimetype.startsWith("image/") ||
//             file.mimetype.startsWith("video/")
//         ) {
//             cb(null, true);
//         } else {
//             cb(new Error("File type not supported."), false);
//         }
//     },
// });
