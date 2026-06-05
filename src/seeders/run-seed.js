require("dotenv").config();

const mongoose = require("mongoose");
const { connectDB } = require("../db/index.db");
const { SEED_RESET } = require("./config/seed.config");
const { loadManifest, printSummary } = require("./utils/logger");
const { ensureUploadDir } = require("./utils/imageHelper");

const { createAdmin } = require("./admin.seed");
const { createPlatform } = require("./platform.seed");
const { createCategories } = require("./category.seed");
const { createPartners } = require("./partner.seed");
const { createHotels } = require("./hotel.seed");
const { createDishes } = require("./dish.seed");
const { createUsers } = require("./user.seed");
const { createDeliveryBoys } = require("./deliveryBoy.seed");
const { createBanners } = require("./banner.seed");

const SEED_COLLECTIONS = [
    "admins",
    "datas",
    "deliverycharges",
    "pincodes",
    "categories",
    "partners",
    "hotels",
    "hoteldishes",
    "users",
    "useraddresses",
    "deliveryboys",
    "banners",
];

async function resetCollections() {
    console.log("🗑️  SEED_RESET=true — clearing seed-managed collections...");
    const db = mongoose.connection.db;
    for (const name of SEED_COLLECTIONS) {
        try {
            const collections = await db.listCollections({ name }).toArray();
            if (collections.length) {
                await db.collection(name).deleteMany({});
                console.log(`   Cleared: ${name}`);
            }
        } catch (err) {
            console.warn(`   Skip ${name}: ${err.message}`);
        }
    }
}

async function runSeed() {
    const manifest = loadManifest();
    const seedContext = {};

    ensureUploadDir();

    console.log("\n🌱 DropEat Database Seeder");
    console.log(`   SEED_ENV: ${process.env.SEED_ENV || "local"}`);
    console.log(`   Mode:     ${manifest.mode || "skip"}`);
    console.log("");

    if (SEED_RESET) {
        await resetCollections();
        manifest.mode = "replace";
    }

    await createAdmin(manifest);
    await createPlatform(manifest);
    await createCategories(manifest, seedContext);
    await createPartners(manifest, seedContext);
    await createHotels(manifest, seedContext);
    await createDishes(manifest, seedContext);
    await createUsers(manifest, seedContext);
    await createDeliveryBoys(manifest, seedContext);
    await createBanners(manifest, seedContext);

    printSummary(seedContext);
}

connectDB()
    .then(() => runSeed())
    .then(() => mongoose.disconnect())
    .then(() => {
        console.log("✅ Disconnected from MongoDB");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ Seed failed:", err);
        mongoose.disconnect().finally(() => process.exit(1));
    });
