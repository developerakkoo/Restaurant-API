const User = require("../models/user.model.js");
const googleStrategy = require("./google.passport.js");
const facebookStrategy = require("./facebook.passport.js");

exports.setupPassports = (passport) => {
    passport.serializeUser((user, done) => {
        if (!user) {
            return done(new Error("User object is null or undefined"));
        }
        let id = user.id || user._id;
        done(null, id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user || null); // return user if exists, else return null
        } catch (error) {
            done(error, null); // In case of error, pass the error to done
        }
    });

    // Initialize strategies
    googleStrategy(passport);
    facebookStrategy(passport);
};
