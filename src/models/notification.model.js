const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema(
    {
        senderId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        receiverId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        message: {
            type: String,
            default: "",
        },
        isImage: {
            type: Boolean,
            default: false,
        },
        image_url: String,
        local_filePath: String,
        read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
