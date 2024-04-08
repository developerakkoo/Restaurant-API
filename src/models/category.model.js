const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        image_url: {
            type: String,
            required: true,
            default: "_",
        },
        local_imagePath: {
            type: String,
            required: true,
            default: "_",
        },
    },
    { timestamps: true },
);

categorySchema.index({ name: "text" });
module.exports = mongoose.model("Category", categorySchema);
