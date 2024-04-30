const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const favoriteSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        dishId: {
            type: Schema.Types.ObjectId,
            ref: "HotelDish",
        },
        hotelId: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Favorite", favoriteSchema);
