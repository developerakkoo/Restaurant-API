const fs = require("fs");
const { MANIFEST_PATH } = require("../config/seed.config");

const credentials = {
    admin: null,
    users: [],
    partners: [],
    drivers: [],
};

function loadManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        throw new Error(`Manifest not found: ${MANIFEST_PATH}`);
    }
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function setAdmin(email, password) {
    credentials.admin = { email, password };
}

function addUser(phoneNumber, password, name) {
    credentials.users.push({ phoneNumber, password, name });
}

function addPartner(phoneNumber, password, name) {
    credentials.partners.push({ phoneNumber, password, name });
}

function addDriver(phoneNumber, name) {
    credentials.drivers.push({ phoneNumber, name });
}

function printSummary(seedContext) {
    const { categories, partners, hotels, dishes, users, drivers, banners } =
        seedContext;

    console.log("\n" + "=".repeat(60));
    console.log("🌱 SEED COMPLETE");
    console.log("=".repeat(60));
    console.log(`Environment: ${process.env.SEED_ENV || "local"}`);
    console.log(`Image base:  ${require("../config/seed.config").getImageBaseUrl()}`);
    console.log("-".repeat(60));
    console.log(`Categories:  ${categories?.length ?? 0}`);
    console.log(`Partners:    ${partners?.length ?? 0}`);
    console.log(`Hotels:      ${hotels?.length ?? 0}`);
    console.log(`Dishes:      ${dishes?.length ?? 0}`);
    console.log(`Users:       ${users?.length ?? 0}`);
    console.log(`Drivers:     ${drivers?.length ?? 0}`);
    console.log(`Banners:     ${banners?.length ?? 0}`);
    console.log("-".repeat(60));
    console.log("CREDENTIALS");
    console.log("-".repeat(60));

    if (credentials.admin) {
        console.log(
            `Admin:     ${credentials.admin.email} / ${credentials.admin.password}`,
        );
    }

    if (credentials.users.length) {
        console.log("Users:");
        credentials.users.forEach((u) => {
            console.log(`  ${u.name} — ${u.phoneNumber} / ${u.password}`);
        });
    }

    if (credentials.partners.length) {
        console.log("Partners:");
        credentials.partners.forEach((p) => {
            console.log(`  ${p.name} — ${p.phoneNumber} / ${p.password}`);
        });
    }

    if (credentials.drivers.length) {
        console.log("Drivers (approved, status=2):");
        credentials.drivers.forEach((d) => {
            console.log(`  ${d.name} — ${d.phoneNumber}`);
        });
    }

    console.log("=".repeat(60) + "\n");
}

module.exports = {
    loadManifest,
    setAdmin,
    addUser,
    addPartner,
    addDriver,
    printSummary,
};
