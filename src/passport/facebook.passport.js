// const FacebookStrategy = require("passport-facebook").Strategy;
// const { ApiError } = require("../utils/ApiErrorHandler.js");
// const User = require("../models/user.model.js");

// module.exports = (passport) => {
//     let facebookCallBackUrl = process.env.PROD_FACEBOOK_CALLBACK_URL;
//     if (process.env.NODE_ENV !== "production") {
//         facebookCallBackUrl = process.env.DEV_FACEBOOK_CALLBACK_URL;
//     }

//     passport.use(
//         new FacebookStrategy(
//             {
//                 clientID: process.env.FACEBOOK_APP_ID,
//                 clientSecret: process.env.FACEBOOK_APP_SECRET,
//                 callbackURL: facebookCallBackUrl,
//                 profileFields: ["id", "email", "name", "picture.type(large)"],
//             },
//             async (_, __, profile, done) => {
//                 const { email, picture } = profile._json;
//                 const name =
//                     profile._json.name ||
//                     profile._json.first_name + " " + profile._json.last_name;
//                 try {
//                     let user = await User.findOne({ email });
//                     if (user) {
//                         return done(null, user);
//                     } else {
//                         const createdUser = await User.create({
//                             name,
//                             email,
//                             profile_image: picture.data.url,
//                         });
//                         done(null, createdUser);
//                     }
//                 } catch (error) {
//                     done(
//                         new ApiError(
//                             500,
//                             "Something went wrong during authentication. Error: " +
//                                 error,
//                         ),
//                         null,
//                     );
//                 }
//             },
//         ),
//     );
// };
