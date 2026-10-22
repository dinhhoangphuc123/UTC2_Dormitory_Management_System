import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateUtilityUsage,
  calculateInvoiceSummary,
  countTicketsByStatus,
  calculateOccupancyStats,
  formatVND,
  formatMetricNumber
} from './calculations.ts';

test('calculateUtilityUsage calculates consumption and limit flags accurately', () => {
  const normalUsage = calculateUtilityUsage({
    oldElectric: 1240,
    newElectric: 1415,
    oldWater: 84,
    newWater: 96,
    internetFee: 100000,
    wasteFee: 20000
  });

  assert.equal(normalUsage.electricUsage, 175);
  assert.equal(normalUsage.waterUsage, 12);
  assert.equal(normalUsage.isOverLimit, false);
  assert.equal(normalUsage.serviceCost, 120000);
  assert.equal(normalUsage.electricCost, 175 * 2800);
  assert.equal(normalUsage.waterCost, 12 * 14500);

  // Test over-limit condition
  const exceededUsage = calculateUtilityUsage({
    oldElectric: 2810,
    newElectric: 3125, // 315 kWh (> 250)
    oldWater: 140,
    newWater: 168 // 28 m3 (> 20)
  });

  assert.equal(exceededUsage.electricUsage, 315);
  assert.equal(exceededUsage.waterUsage, 28);
  assert.equal(exceededUsage.isOverLimit, true);
});

test('calculateInvoiceSummary aggregates totals and percentages', () => {
  const summary = calculateInvoiceSummary([
    { id: '1', amount: 1000000, status: 'paid' },
    { id: '2', amount: 500000, status: 'paid' },
    { id: '3', amount: 300000, status: 'pending' },
    { id: '4', amount: 200000, status: 'overdue' }
  ]);

  assert.equal(summary.totalExpected, 2000000);
  assert.equal(summary.totalPaid, 1500000);
  assert.equal(summary.totalUnpaid, 500000);
  assert.equal(summary.overdueCount, 1);
  assert.equal(summary.overdueAmount, 200000);
  assert.equal(summary.paidPercentage, 75);
});

test('countTicketsByStatus correctly tallies maintenance items', () => {
  const counts = countTicketsByStatus([
    { id: '1', status: 'PENDING' },
    { id: '2', status: 'PENDING' },
    { id: '3', status: 'IN_PROGRESS' },
    { id: '4', status: 'COMPLETED' },
    { id: '5', status: 'COMPLETED' },
    { id: '6', status: 'COMPLETED' }
  ]);

  assert.equal(counts.total, 6);
  assert.equal(counts.pending, 2);
  assert.equal(counts.inProgress, 1);
  assert.equal(counts.completed, 3);
});

test('calculateOccupancyStats computes dorm-wide occupancy metrics', () => {
  const stats = calculateOccupancyStats([
    { code: 'A01', totalBeds: 600, occupiedBeds: 588 },
    { code: 'A02', totalBeds: 600, occupiedBeds: 576 },
    { code: 'B01', totalBeds: 600, occupiedBeds: 592 }
  ]);

  assert.equal(stats.totalBeds, 1800);
  assert.equal(stats.occupiedBeds, 1756);
  assert.equal(stats.vacantBeds, 44);
  assert.equal(stats.occupancyRate, 97.6);
});

test('formatVND and formatMetricNumber formatting works as expected', () => {
  assert.ok(formatVND(1480000).includes('1.480.000'));
  assert.ok(formatMetricNumber(48250).includes('48.250'));
});
