const DeliveryBoy = require("../models/deliveryBoy.model");
const { faker } = require("@faker-js/faker");
const path = require("path");
const { IMAGES_DIR } = require("./config/seed.config");
const {
    copyProfileImage,
    getProfileImagePath,
    placeholderProfileFields,
} = require("./utils/imageHelper");
const { addDriver } = require("./utils/logger");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const createDeliveryBoys = async (manifest, seedContext) => {
    const count = manifest.counts?.drivers ?? 5;
    const location = manifest.location || { city: "Pune" };
    const profilesDir = path.join(IMAGES_DIR, "profiles", "drivers");
    const mode = manifest.mode || "skip";

    const drivers = [];

    for (let i = 0; i < count; i++) {
        const phoneNumber = `8${String(100000000 + i).slice(-9)}`;
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const name = `${firstName} ${lastName}`;

        if (mode === "skip") {
            const existing = await DeliveryBoy.findOne({ phoneNumber });
            if (existing) {
                addDriver(phoneNumber, `${existing.firstName} ${existing.lastName}`);
                drivers.push(existing);
                continue;
            }
        }

        const profilePath = getProfileImagePath(profilesDir, i);
        const profileFields = profilePath
            ? copyProfileImage(profilePath) || placeholderProfileFields()
            : placeholderProfileFields();

        if (profilePath && profileFields.profile_image === "_") {
            console.warn(`⚠️  Could not copy driver profile image: ${profilePath}`);
        }

        const driver = await DeliveryBoy.create({
            firstName,
            lastName,
            fatherName: faker.person.fullName(),
            dateOfBirth: faker.date
                .birthdate({ min: 22, max: 45, mode: "age" })
                .toISOString()
                .split("T")[0],
            email: `driver${i + 1}@dropeat.test`,
            phoneNumber,
            bloodGroup: faker.helpers.arrayElement(BLOOD_GROUPS),
            city: location.city,
            address: faker.location.streetAddress(),
            languageKnown: ["English", "Hindi", "Marathi"],
            ...profileFields,
            status: 2,
            isOnline: false,
        });

        addDriver(phoneNumber, name);
        drivers.push(driver);
    }

    console.log(`🌱 ${drivers.length} driver(s) ready`);
    seedContext.drivers = drivers;
    return drivers;
};

module.exports = { createDeliveryBoys };
