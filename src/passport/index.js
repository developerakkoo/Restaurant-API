const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { ApiError } = require("../utils/ApiErrorHandler.js");
const User = require("../models/user.model.js");

exports.setupPassports = (passport) => {
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user || null); // return user if exists, else return null
        } catch (error) {
            done(null, null); // In case of error, return null to create a new session
        }
    });

    /* Google auth passport middleware*/
    let callBack_url = process.env.PROD_GOOGLE_CALLBACK_URL;
    if (process.env.NODE_ENV !== "production") {
        callBack_url = process.env.DEV_GOOGLE_CALLBACK_URL;
    }
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: callBack_url,
            },
            async (_, __, profile, done) => {
                const { name, email, picture } = profile._json;
                try {
                    // Check if the user with email already exists
                    let user = await User.findOne({ email });
                    if (user) {
                        return done(null, user);
                    } else {
                        const createdUser = await User.create({
                            name,
                            email,
                            profile_image: picture,
                        });
                        done(null, createdUser);
                    }
                } catch (error) {
                    done(
                        new ApiError(
                            500,
                            "Something went wrong during authentication. Error: " +
                                error,
                        ),
                        null,
                    );
                }
            },
        ),
    );
};
