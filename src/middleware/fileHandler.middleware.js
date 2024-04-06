const multer = require("multer");
const path = require("path");

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'upload')); // Specify the directory where uploaded files will be saved
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Rename file with unique timestamp + original extension
    },
});

exports.upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
    },
    fileFilter: function (req, file, cb) {
        // Validate file types
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPEG, PNG, and JPG images are allowed."));
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
