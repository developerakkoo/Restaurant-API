const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userTrackSchema = new Schema({
    userId:{
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    date:{
        type:String,
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model("UserTrack", userTrackSchema);
