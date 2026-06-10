const test = require("node:test");
const assert = require("node:assert/strict");
const {
    selectDeliveryTierPrice,
    buildBreakdown,
    FREE_DELIVERY_ABOVE,
} = require("../../src/services/orderPricing.service");

const tiers = {
    range1Price: 25,
    range1MinKm: 0,
    range1MaxKm: 1,
    range2Price: 30,
    range2MinKm: 1,
    range2MaxKm: 2,
    range3Price: 40,
    range3MinKm: 2,
    range3MaxKm: 3,
};

const platformData = { platformFee: 2, deliveryBoyAllowance: 5 };

test("delivery tier: up to 1km is ₹25", () => {
    const { deliveryCharges } = selectDeliveryTierPrice(0.8, tiers);
    assert.equal(deliveryCharges, 25);
});

test("handling fee is 2% of items total", () => {
    const result = buildBreakdown({
        subtotal: 100,
        distanceInKm: 0.5,
        deliveryConfig: tiers,
        platformData,
        promoCode: null,
        userId: null,
        userOrderExists: false,
    });

    assert.equal(result.subtotal, 100);
    assert.equal(result.deliveryCharges, 25);
    assert.equal(result.platformFee, 2);
    assert.equal(result.gstAmount, 0);
    assert.equal(result.total, 127);
    assert.equal(result.totalAmountToPay, 127);
    assert.equal(result.roundOffValue, 0);
});

test("round-off applies to fractional total", () => {
    const result = buildBreakdown({
        subtotal: 33,
        distanceInKm: 0.5,
        deliveryConfig: tiers,
        platformData: { platformFee: 2, deliveryBoyAllowance: 0 },
        promoCode: null,
        userId: null,
        userOrderExists: false,
    });

    // 33 + 25 + 0.66 = 58.66 -> ceil 59
    assert.equal(result.total, 58.66);
    assert.equal(result.totalAmountToPay, 59);
    assert.equal(result.roundOffValue, 0.34);
});

test("free delivery when items total >= threshold", () => {
    const result = buildBreakdown({
        subtotal: FREE_DELIVERY_ABOVE,
        distanceInKm: 1,
        deliveryConfig: tiers,
        platformData,
        promoCode: null,
        userId: null,
        userOrderExists: false,
    });

    assert.equal(result.deliveryCharges, 0);
    assert.equal(result.platformFee, 10);
});
