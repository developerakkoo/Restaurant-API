const { Schema, model } = require("mongoose");

const bannerSchema = new Schema({
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
    redirect_url: {
        type: String,
        required: true,
        default: "_",
    },
    type: {
        type: Number,
        required: true,
        default: 0, // 0 for resto offers banner; 1 for near by offer banner 
    },
    hotelId:{
        type: Schema.Types.ObjectId,
        ref: "Hotel",
    },
    title: {
        type: String,
        required: true,
        default: "_",
    },
    description: {
        type: String,
        required: true,
        default: "_",
    },
}, {
    timestamps: true,
});

module.exports = model("Banner", bannerSchema);
