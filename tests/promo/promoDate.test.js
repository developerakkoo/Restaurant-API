const test = require("node:test");
const assert = require("node:assert/strict");
const moment = require("moment");
const {
    parsePromoExpiry,
    formatPromoExpiryForStorage,
    isPromoExpired,
    enrichPromoRecord,
} = require("../../src/utils/promoDate.util");

test("parsePromoExpiry accepts YYYY-MM-DD", () => {
    const parsed = parsePromoExpiry("2026-12-31");
    assert.ok(parsed);
    assert.equal(parsed.format("YYYY-MM-DD"), "2026-12-31");
});

test("parsePromoExpiry accepts DD-MM-YYYY legacy format", () => {
    const parsed = parsePromoExpiry("31-12-2026");
    assert.ok(parsed);
    assert.equal(parsed.format("YYYY-MM-DD"), "2026-12-31");
});

test("formatPromoExpiryForStorage normalizes legacy input", () => {
    assert.equal(formatPromoExpiryForStorage("25-09-2024"), "2024-09-25");
    assert.equal(formatPromoExpiryForStorage("2024-09-25"), "2024-09-25");
});

test("isPromoExpired treats today as active until end of day IST", () => {
    const today = moment().utcOffset("+05:30").format("YYYY-MM-DD");
    assert.equal(isPromoExpired(today), false);
});

test("isPromoExpired marks yesterday as expired", () => {
    const yesterday = moment()
        .utcOffset("+05:30")
        .subtract(1, "day")
        .format("YYYY-MM-DD");
    assert.equal(isPromoExpired(yesterday), true);
});

test("enrichPromoRecord adds status fields", () => {
    const tomorrow = moment()
        .utcOffset("+05:30")
        .add(1, "day")
        .format("YYYY-MM-DD");
    const enriched = enrichPromoRecord({
        code: "TEST",
        expiry: tomorrow,
        isActive: true,
    });
    assert.equal(enriched.isExpired, false);
    assert.equal(enriched.status, "active");
});
