const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const userAddressSchema = new Schema(
    {
        userId:{
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        selected: {
            type: Boolean,
            required: true,
            default: false,
        }
    },
    { timestamps: true },
);



module.exports = mongoose.model("UserAddress", userAddressSchema);
