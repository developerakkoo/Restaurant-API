const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const jwt = require("jsonwebtoken");
const { hash } = require("../constant");
const bcrypt = require("bcrypt");

const partnerSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            default: "_",
        },
        profile_image: {
            type: String,
            required: true,
            default: "_",
        },
        email: {
            type: String,
            required: true,
            unique: true,
            default: "_",
        },
        phoneNumber: {
            type: String,
            required: true,
            unique: true,
            default: "_",
        },
        password: {
            type: String,
            required: true,
        },
        status: {
            type: Number,
            required: true,
            default: 0, // default
            enum:[0,1] //  1= block
        },
        refreshToken: {
            type: String,
            require: true,
            default: "-",
        },
    },
    { timestamps: true },
);

/**
 * Pre-save hook that encrypts the password before saving it to the database.
 * @param {import('mongoose').Document} doc - The document being saved.
 * @param {Function} next - A callback function to invoke after saving the document.
 */
partnerSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, hash);
});

/**
 * Compares the given plaintext password with the hashed password stored in the database.
 * @param {string} password - The plaintext password to compare with the hashed password.
 * @returns {boolean} `true` if the passwords match, `false` otherwise.
 */
partnerSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

partnerSchema.index({ name: "text" }, { email: "text" }, { phoneNumber: "text" });
module.exports = mongoose.model("Partner", partnerSchema);
