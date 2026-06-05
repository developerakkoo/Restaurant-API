const Partner = require("../models/partner.model");
const { faker } = require("@faker-js/faker");
const path = require("path");
const { IMAGES_DIR } = require("./config/seed.config");
const {
    copyProfileImage,
    getProfileImagePath,
    placeholderProfileFields,
} = require("./utils/imageHelper");
const { addPartner } = require("./utils/logger");

const createPartners = async (manifest, seedContext) => {
    const count = manifest.counts?.partners ?? 5;
    const password = manifest.defaultPassword || "Test@12345";
    const profilesDir = path.join(IMAGES_DIR, "profiles", "partners");
    const mode = manifest.mode || "skip";

    const partners = [];

    for (let i = 0; i < count; i++) {
        const phoneNumber = `9${String(100000000 + i).slice(-9)}`;
        const name = faker.person.fullName();
        const email = `partner${i + 1}@dropeat.test`;

        if (mode === "skip") {
            const existing = await Partner.findOne({ phoneNumber });
            if (existing) {
                addPartner(phoneNumber, password, existing.name);
                partners.push(existing);
                continue;
            }
        }

        const profilePath = getProfileImagePath(profilesDir, i);
        const profileFields = profilePath
            ? copyProfileImage(profilePath) || { profile_image: "_" }
            : { profile_image: "_" };

        if (profilePath && profileFields.profile_image === "_") {
            console.warn(`⚠️  Could not copy partner profile image: ${profilePath}`);
        }

        const partner = await Partner.create({
            name,
            email,
            phoneNumber,
            password,
            ...profileFields,
            status: 0,
        });

        addPartner(phoneNumber, password, name);
        partners.push(partner);
    }

    console.log(`🌱 ${partners.length} partner(s) ready`);
    seedContext.partners = partners;
    return partners;
};

module.exports = { createPartners };
