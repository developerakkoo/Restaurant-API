const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { ApiError } = require("../utils/ApiErrorHandler.js");
const User = require("../models/user.model.js");

module.exports = (passport) => {
    let googleCallBackUrl = process.env.PROD_GOOGLE_CALLBACK_URL;
    if (process.env.NODE_ENV !== "production") {
        googleCallBackUrl = process.env.DEV_GOOGLE_CALLBACK_URL;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: googleCallBackUrl,
            },
            async (_, __, profile, done) => {
                const { name, email, picture } = profile._json;
                try {
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
