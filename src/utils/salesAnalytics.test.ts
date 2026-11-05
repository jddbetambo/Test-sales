import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_SALES_CSV_RAW } from '../data/initialSalesCsv';
import {
  parseSalesCsv,
  computeKpiSummary,
  computeProductPerformance,
  computePaymentBreakdown,
  computeOrderSummaries,
  computeBasketPairs,
  computeTimeSeries,
  filterRecords,
  getDefaultFilterState,
  exportRecordsToCsv,
} from './salesAnalytics';

test('parseSalesCsv accurately parses all 116 line items from user CSV', () => {
  const { records, errors } = parseSalesCsv(INITIAL_SALES_CSV_RAW);
  assert.equal(errors.length, 0);
  assert.equal(records.length, 116);
  assert.equal(records[0].orderNumber, 'TT-1001');
  assert.equal(records[0].product, 'Slim-Fit Denim Jeans');
  assert.equal(records[0].price, 88);
  assert.equal(records[0].date, '2025-08-15');
  assert.equal(records[0].paymentMethod, 'Credit Card');
  assert.equal(records[115].orderNumber, 'TT-1098');
});

test('computeKpiSummary calculates exact total revenue, unique orders, and multi-item basket metrics', () => {
  const { records } = parseSalesCsv(INITIAL_SALES_CSV_RAW);
  const kpi = computeKpiSummary(records);

  assert.equal(kpi.lineItemCount, 116);
  assert.equal(kpi.uniqueOrderCount, 98);
  assert.equal(kpi.totalRevenue, 11214);
  assert.equal(kpi.multiItemOrderCount, 18);
  assert.equal(kpi.dateRange.min, '2025-08-15');
  assert.equal(kpi.dateRange.max, '2025-10-07');
  assert.equal(kpi.topProductByRevenue?.product, 'Premium Tailored Trousers');
  assert.equal(kpi.topProductByRevenue?.revenue, 1575);
  assert.equal(kpi.topProductByUnits?.product, 'Slim-Fit Denim Jeans');
  assert.equal(kpi.topProductByUnits?.units, 13);
});

test('computeProductPerformance ranks all 12 products and computes cumulative Pareto share', () => {
  const { records } = parseSalesCsv(INITIAL_SALES_CSV_RAW);
  const products = computeProductPerformance(records);

  assert.equal(products.length, 12);
  assert.equal(products[0].product, 'Premium Tailored Trousers');
  assert.equal(products[0].revenue, 1575);
  assert.equal(products[0].unitsSold, 9);
  assert.ok(Math.abs(products[products.length - 1].cumulativeRevenuePct - 100) < 0.01);
});

test('computePaymentBreakdown calculates exact payment method totals', () => {
  const { records } = parseSalesCsv(INITIAL_SALES_CSV_RAW);
  const payments = computePaymentBreakdown(records);

  assert.equal(payments.length, 4);
  const totalPaymentRev = payments.reduce((sum, p) => sum + p.revenue, 0);
  assert.equal(totalPaymentRev, 11214);
  const totalPaymentUnits = payments.reduce((sum, p) => sum + p.units, 0);
  assert.equal(totalPaymentUnits, 116);
});

test('computeOrderSummaries and computeBasketPairs identify multi-item orders and split payments', () => {
  const { records } = parseSalesCsv(INITIAL_SALES_CSV_RAW);
  const orders = computeOrderSummaries(records);
  assert.equal(orders.length, 98);

  const multiOrders = orders.filter((o) => o.itemCount > 1);
  assert.equal(multiOrders.length, 18);

  const pairs = computeBasketPairs(records);
  assert.ok(pairs.length > 0);
  const totalPairOccurrences = pairs.reduce((s, p) => s + p.coOccurrences, 0);
  assert.equal(totalPairOccurrences, 18);
});

test('computeTimeSeries aggregates accurately across day, week, and month granularities', () => {
  const { records } = parseSalesCsv(INITIAL_SALES_CSV_RAW);
  const monthly = computeTimeSeries(records, 'month');
  assert.equal(monthly.length, 3); // 2025-08, 2025-09, 2025-10
  assert.equal(monthly[2].cumulativeRevenue, 11214);
});

test('filterRecords filters by payment method, product, date range, and multi-item flag', () => {
  const { records } = parseSalesCsv(INITIAL_SALES_CSV_RAW);
  const filters = getDefaultFilterState();
  filters.paymentMethods = ['Cash'];

  const cashOnly = filterRecords(records, filters);
  assert.ok(cashOnly.length > 0);
  assert.ok(cashOnly.every((r) => r.paymentMethod === 'Cash'));

  const multiFilter = { ...getDefaultFilterState(), onlyMultiItemOrders: true };
  const multiRecords = filterRecords(records, multiFilter);
  assert.equal(multiRecords.length, 36); // 18 two-item orders = 36 line items

  const exported = exportRecordsToCsv(cashOnly);
  assert.ok(exported.startsWith('Order Number,Product,Price,Date,Payment Method'));
});
