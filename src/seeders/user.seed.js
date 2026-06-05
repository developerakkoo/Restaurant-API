const User = require("../models/user.model");
const UserAddress = require("../models/userAddress.model");
const { faker } = require("@faker-js/faker");
const path = require("path");
const {
    IMAGES_DIR,
} = require("./config/seed.config");
const {
    copyProfileImage,
    getProfileImagePath,
    placeholderProfileFields,
} = require("./utils/imageHelper");
const { addUser } = require("./utils/logger");

const createUsers = async (manifest, seedContext) => {
    const count = manifest.counts?.users ?? 10;
    const password = manifest.defaultPassword || "Test@12345";
    const location = manifest.location || { lat: 18.5204, lng: 73.8567, city: "Pune" };
    const profilesDir = path.join(IMAGES_DIR, "profiles", "users");
    const mode = manifest.mode || "skip";

    const users = [];

    for (let i = 0; i < count; i++) {
        const phoneNumber = faker.string.numeric({ length: 10, exclude: ["0"] });
        const name = faker.person.fullName();
        const email = faker.internet.email();

        if (mode === "skip") {
            const existing = await User.findOne({ phoneNumber });
            if (existing) {
                users.push(existing);
                continue;
            }
        }

        const profilePath = getProfileImagePath(profilesDir, i);
        const profileFields = profilePath
            ? copyProfileImage(profilePath) || placeholderProfileFields()
            : placeholderProfileFields();

        if (profilePath && profileFields.profile_image === "_") {
            console.warn(`⚠️  Could not copy user profile image: ${profilePath}`);
        }

        const user = await User.create({
            name,
            email,
            phoneNumber,
            password,
            ...profileFields,
            status: 0,
        });

        await UserAddress.create({
            userId: user._id,
            type: "Home",
            address: `${faker.location.streetAddress()}, ${location.city}`,
            location: {
                type: "Point",
                coordinates: [location.lng, location.lat],
            },
            selected: true,
        });

        addUser(phoneNumber, password, name);
        users.push(user);
    }

    console.log(`🌱 ${users.length} user(s) ready`);
    seedContext.users = users;
    return users;
};

module.exports = { createUsers };
