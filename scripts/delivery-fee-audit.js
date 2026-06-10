#!/usr/bin/env node
/**
 * Delivery fee audit script — mirrors backend tier logic from order.controller.js
 * Run: node scripts/delivery-fee-audit.js
 */

const { getDistance } = require('../src/utils/getDistance.utils');

// Live production config (fetched 2026-06-10 via GET admin/get/deliveryCharges/data)
const LIVE_TIERS = {
  range1Price: 25,
  range1MinKm: 1,
  range1MaxKm: 1,
  range2Price: 30,
  range2MinKm: 1,
  range2MaxKm: 2,
  range3Price: 40,
  range3MinKm: 2,
  range3MaxKm: 3,
};

const LIVE_PLATFORM = {
  gstPercentage: 3,
  gstIsActive: false,
  platformFee: 2,
  deliveryBoyAllowance: 5,
};

const FREE_DELIVERY_THRESHOLD = 500;

function selectTierPrice(distanceInKm, config) {
  let deliveryCharges = 0;
  let deliveryBoyCompensationAmount = 0;

  if (
    distanceInKm >= config.range1MinKm &&
    distanceInKm <= config.range1MaxKm
  ) {
    deliveryCharges = config.range1Price;
    deliveryBoyCompensationAmount = config.range1Price;
  } else if (
    distanceInKm > config.range2MinKm &&
    distanceInKm <= config.range2MaxKm
  ) {
    deliveryCharges = config.range2Price;
    deliveryBoyCompensationAmount = config.range2Price;
  } else if (
    distanceInKm > config.range3MinKm &&
    distanceInKm <= config.range3MaxKm
  ) {
    deliveryCharges = config.range3Price;
    deliveryBoyCompensationAmount = config.range3Price;
  } else {
    deliveryCharges = config.range3Price;
    deliveryBoyCompensationAmount = config.range3Price;
  }

  return { deliveryCharges, deliveryBoyCompensationAmount };
}

function calculateBackendBreakdown(subtotal, distanceInKm, config, platform) {
  const gstAmount = platform.gstIsActive
    ? (subtotal * platform.gstPercentage) / 100
    : 0;

  let { deliveryCharges, deliveryBoyCompensationAmount } = selectTierPrice(
    distanceInKm,
    config
  );

  if (subtotal >= FREE_DELIVERY_THRESHOLD) {
    deliveryCharges = 0;
  }

  const platformFee = (subtotal * platform.platformFee) / 100;
  const total = subtotal + gstAmount + deliveryCharges + platformFee;

  return {
    subtotal,
    gstAmount,
    distanceInKm,
    deliveryCharges,
    platformFee,
    deliveryBoyCompensation: deliveryBoyCompensationAmount + platform.deliveryBoyAllowance,
    total,
  };
}

function calculateTab2Breakdown(subtotal, distanceInKm, platform, promoDiscount = 0) {
  const discountedSubtotal = subtotal - promoDiscount;
  const gst = platform.gstIsActive
    ? (platform.gstPercentage / 100) * discountedSubtotal
    : 0;
  const platformFee = (platform.platformFee / 100) * discountedSubtotal;

  let deliveryFee = 0;
  if (discountedSubtotal <= FREE_DELIVERY_THRESHOLD) {
    deliveryFee = Number((distanceInKm * 20).toFixed(2));
  }

  const total = discountedSubtotal + gst + platformFee + deliveryFee;
  return {
    subtotal,
    discountedSubtotal,
    gst,
    platformFee,
    deliveryFee,
    total,
  };
}

// Pune reference coords for distance tests
const SHOP = { lat: 18.5204, lng: 73.8567 };

function coordsAtDistanceKm(targetKm) {
  // Move north ~111km per degree latitude
  const lat = SHOP.lat + targetKm / 111;
  return { lat, lng: SHOP.lng };
}

const testMatrix = [
  { label: 'Within tier 1', targetKm: 1.0, subtotal: 400 },
  { label: 'Tier 1 boundary (max)', targetKm: 1.0, subtotal: 400 },
  { label: 'Just above tier 1', targetKm: 1.1, subtotal: 400 },
  { label: 'Mid tier 2', targetKm: 1.5, subtotal: 400 },
  { label: 'Mid tier 3', targetKm: 2.5, subtotal: 400 },
  { label: 'Beyond max tier', targetKm: 5.0, subtotal: 400 },
  { label: 'Free delivery (subtotal >= 500)', targetKm: 1.0, subtotal: 600 },
  { label: 'Tab2 hardcoded 3km case', targetKm: 3.0, subtotal: 40 },
];

console.log('=== Delivery Fee Audit — Tier Logic Simulation ===\n');
console.log('Live tier config:', JSON.stringify(LIVE_TIERS, null, 2));
console.log('Live platform config:', JSON.stringify(LIVE_PLATFORM, null, 2));
console.log('');

console.log('| # | Scenario | Distance (km) | Subtotal | Backend delivery | Tab2 delivery (3km fixed) | Match? |');
console.log('|---|----------|---------------|----------|------------------|---------------------------|--------|');

testMatrix.forEach((row, i) => {
  const user = coordsAtDistanceKm(row.targetKm);
  const distance = getDistance(SHOP.lat, SHOP.lng, user.lat, user.lng);
  const backend = calculateBackendBreakdown(row.subtotal, distance, LIVE_TIERS, LIVE_PLATFORM);
  const tab2Dist = row.label.includes('Tab2') ? 3 : 3; // tab2 always uses 3 in production code paths
  const tab2 = calculateTab2Breakdown(row.subtotal, tab2Dist, LIVE_PLATFORM);

  const match = backend.deliveryCharges === tab2.deliveryFee ? 'YES' : 'NO';
  console.log(
    `| ${i + 1} | ${row.label} | ${distance.toFixed(2)} | ₹${row.subtotal} | ₹${backend.deliveryCharges} | ₹${tab2.deliveryFee} | ${match} |`
  );
});

console.log('\n=== Boundary edge cases (seed defaults 0-3, 3-6, 6-10) ===\n');
const SEED_TIERS = {
  range1Price: 30,
  range1MinKm: 0,
  range1MaxKm: 3,
  range2Price: 50,
  range2MinKm: 3,
  range2MaxKm: 6,
  range3Price: 80,
  range3MinKm: 6,
  range3MaxKm: 10,
};

[0, 3, 3.01, 6, 6.01, 10, 12].forEach((km) => {
  const { deliveryCharges } = selectTierPrice(km, SEED_TIERS);
  console.log(`  distance=${km} km → ₹${deliveryCharges}`);
});

console.log('\n=== Real order cross-check (order 88BE18-6A2) ===');
const orderSubtotal = 40;
const backendOrder = calculateBackendBreakdown(orderSubtotal, 1.0, LIVE_TIERS, LIVE_PLATFORM);
const tab2Order = calculateTab2Breakdown(orderSubtotal, 3, LIVE_PLATFORM);
console.log(`  Stored on order: deliveryCharges=₹60`);
console.log(`  Backend tier @1km: ₹${backendOrder.deliveryCharges}`);
console.log(`  Tab2 formula (3×20): ₹${tab2Order.deliveryFee}`);
console.log(`  Stored matches Tab2: ${60 === tab2Order.deliveryFee ? 'YES' : 'NO'}`);
console.log(`  Stored matches Backend: ${60 === backendOrder.deliveryCharges ? 'YES' : 'NO'}`);
