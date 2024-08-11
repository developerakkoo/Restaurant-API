const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const jwt = require("jsonwebtoken");
const { hash } = require("../constant");
const bcrypt = require("bcrypt");

const deliveryBoySchema = new Schema(
    {
        firstName: {
            type: String,
            required: true,
        },
        lastName: {
            type: String,
            required: true,
        },
        fatherName: {
            type: String,
            required: true,
        },
        dateOfBirth: {
            type: String,
            required: true,
        },
        profile_image: {
            type: String,
        },
        local_profileImagePath: {
            type: String,
        },
        email: {
            type: String,
            // unique: true,
        },
        phoneNumber: {
            type: String,
            required: true,
            unique: true,
        },
        bloodGroup: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            // required: true,
        },
        address: {
            type: String,
            required: true,
        },
        languageKnown: {
            type: [String],
            required: true,
        },
        // password: {
        //     type: String,
        //     required: true,
        // },
        refreshToken: {
            type: String,
            require: true,
            default: "-",
        },
        isOnline: {
            type: Boolean,
        },
        status: {
            type: Number,
            required: true,
            default: 0,
            enum: [0, 1, 2, 3], // pending,blocked, approved, rejected,
        },
    },
    { timestamps: true },
);

/**
 * Pre-save hook that encrypts the password before saving it to the database.
 * @param {import('mongoose').Document} doc - The document being saved.
 * @param {Function} next - A callback function to invoke after saving the document.
 */
// deliveryBoySchema.pre("save", async function (next) {
//     if (!this.isModified("password")) return next();
//     this.password = await bcrypt.hash(this.password, hash);
// });

/**
 * Compares the given plaintext password with the hashed password stored in the database.
 * @param {string} password - The plaintext password to compare with the hashed password.
 * @returns {boolean} `true` if the passwords match, `false` otherwise.
 */
// deliveryBoySchema.methods.isPasswordCorrect = async function (password) {
//     return await bcrypt.compare(password, this.password);
// };

deliveryBoySchema.index(
    { name: "text" },
    { email: "text" },
    { phoneNumber: "text" },
);
module.exports = mongoose.model("deliveryBoy", deliveryBoySchema);
