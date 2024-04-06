const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const jwt = require("jsonwebtoken");
const { hash } = require("../constant");
const bcrypt = require("bcrypt");

const adminSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
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
adminSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, hash);
});

/**
 * Compares the given plaintext password with the hashed password stored in the database.
 * @param {string} password - The plaintext password to compare with the hashed password.
 * @returns {boolean} `true` if the passwords match, `false` otherwise.
 */
adminSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
