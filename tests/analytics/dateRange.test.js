const test = require("node:test");
const assert = require("node:assert/strict");
const {
    parseAnalyticsDate,
    buildOrderDateMatch,
    previousPeriod,
    CANCELLED_STATUSES,
} = require("../../src/utils/analyticsDateRange");
const { computeReconciliation } = require("../../src/services/adminAnalytics.service");

test("parseAnalyticsDate accepts ISO and legacy formats", () => {
    assert.ok(parseAnalyticsDate("2026-06-05"));
    assert.ok(parseAnalyticsDate("05-06-2026"));
    assert.equal(parseAnalyticsDate("invalid"), null);
});

test("buildOrderDateMatch uses inclusive end of day", () => {
    const range = buildOrderDateMatch("2026-06-01", "2026-06-05");
    assert.ifError(range.error);
    assert.equal(range.startDate, "2026-06-01");
    assert.equal(range.endDate, "2026-06-05");
    const endHours = range.match.createdAt.$lte.getHours();
    assert.equal(endHours, 23);
});

test("previousPeriod returns equal-length window", () => {
    const prev = previousPeriod("2026-06-01", "2026-06-05");
    assert.equal(prev.startDate, "2026-05-27");
    assert.equal(prev.endDate, "2026-05-31");
});

test("cancelled statuses include partner, customer, and driver rejections", () => {
    assert.deepEqual(CANCELLED_STATUSES, [5, 7, 8]);
});

test("computeReconciliation passes when totals align", () => {
    const kpis = { totalOrders: 10, totalRevenue: 1000, totalCanceledOrders: 2 };
    const orderChart = { data: [4, 6] };
    const revenueChart = { data: [400, 600] };
    const statusBreakdown = {
        byStatus: [{ count: 8 }, { count: 2 }],
        cancellations: [{ count: 1 }, { count: 1 }],
    };
    const result = computeReconciliation(kpis, orderChart, revenueChart, statusBreakdown);
    assert.equal(result.passed, true);
});

test("computeReconciliation fails when chart sum mismatches", () => {
    const kpis = { totalOrders: 10, totalRevenue: 1000, totalCanceledOrders: 2 };
    const orderChart = { data: [4, 5] };
    const revenueChart = { data: [400, 600] };
    const statusBreakdown = {
        byStatus: [{ count: 10 }],
        cancellations: [{ count: 2 }],
    };
    const result = computeReconciliation(kpis, orderChart, revenueChart, statusBreakdown);
    assert.equal(result.passed, false);
});
