/**
 * One-time backfill: set petrolExpensePerOrder on existing DriverSettings documents.
 * Run: node scripts/backfill-petrol-expense-settings.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const DriverSettings = require('../src/models/Delivery-Boy/driverSettings');

const DEFAULT_PETROL = 5;

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI or MONGO_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const settings = await DriverSettings.findOne();

  if (!settings) {
    console.log('No DriverSettings document found. Nothing to backfill.');
    await mongoose.disconnect();
    return;
  }

  if (settings.petrolExpensePerOrder != null) {
    console.log(
      `DriverSettings already has petrolExpensePerOrder=${settings.petrolExpensePerOrder}`
    );
    await mongoose.disconnect();
    return;
  }

  settings.petrolExpensePerOrder = DEFAULT_PETROL;
  await settings.save();
  console.log(`Backfilled petrolExpensePerOrder=${DEFAULT_PETROL}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
