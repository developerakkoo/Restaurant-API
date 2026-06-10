/**
 * Migration: backfill verificationStatus for existing delivery boys
 *
 * Usage: node src/scripts/migrate-driver-verification.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const DeliverBoy = require("../models/deliveryBoy.model");

async function migrateDriverVerification() {
    try {
        await mongoose.connect(
            process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant",
        );
        console.log("Connected to MongoDB");

        const drivers = await DeliverBoy.find({});
        let updated = 0;

        for (const driver of drivers) {
            if (driver.verificationStatus) {
                continue;
            }

            let verificationStatus = "not_submitted";
            if (driver.status === 2) {
                verificationStatus = "verified";
            } else if (driver.status === 3) {
                verificationStatus = "permanently_rejected";
            }

            await DeliverBoy.findByIdAndUpdate(driver._id, {
                $set: { verificationStatus },
            });
            updated += 1;
        }

        console.log(`Migration complete. Updated ${updated} drivers.`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrateDriverVerification();
