const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const jwt = require("jsonwebtoken");
const { hash } = require("../constant");
const bcrypt = require("bcrypt");

const userSchema = new Schema(
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
        local_profileImagePath: {
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
            // required: true,
            // unique: true,
        },
        firebaseToken: {
            type: String,
        },
        isOnline: {
            type: Boolean,
            required: true,
            default: false,
        },
        password: {
            type: String,
            // required: true,
        },
        refreshToken: {
            type: String,
            require: true,
            default: "-",
        },
        status: {
            type: Number,
            required: true,
            default: 0, // default
            enum: [0, 1], //  1= block
        },
    },
    { timestamps: true },
);

/**
 * Pre-save hook that encrypts the password before saving it to the database.
 * @param {import('mongoose').Document} doc - The document being saved.
 * @param {Function} next - A callback function to invoke after saving the document.
 */
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, hash);
});

/**
 * Compares the given plaintext password with the hashed password stored in the database.
 * @param {string} password - The plaintext password to compare with the hashed password.
 * @returns {boolean} `true` if the passwords match, `false` otherwise.
 */
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.index({ name: "text" }, { email: "text" }, { phoneNumber: "text" });
module.exports = mongoose.model("User", userSchema);
