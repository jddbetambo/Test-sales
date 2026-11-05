export type PaymentMethod = 'Credit Card' | 'Debit Card' | 'eWallet' | 'Cash' | string;

export type ProductCategory =
  | 'Tailored & Dress'
  | 'Denim & Workwear'
  | 'Casual & Chinos'
  | 'Active & Shorts';

export type PriceTier = 'Value (< $80)' | 'Core ($80–$110)' | 'Premium (> $110)';

export interface SaleRecord {
  id: string;
  orderNumber: string;
  product: string;
  price: number;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  category: ProductCategory;
  priceTier: PriceTier;
  dayOfWeekIndex: number; // 0 (Sun) - 6 (Sat)
  dayOfWeekName: string;
  monthKey: string; // YYYY-MM
  weekKey: string; // YYYY-MM-DD (Monday of that week)
}

export interface FilterState {
  searchQuery: string;
  products: string[];
  categories: ProductCategory[];
  paymentMethods: string[];
  priceTiers: PriceTier[];
  dateStart: string;
  dateEnd: string;
  onlyMultiItemOrders: boolean;
}

export interface KpiSummary {
  totalRevenue: number;
  lineItemCount: number;
  uniqueOrderCount: number;
  averageOrderValue: number;
  averageItemPrice: number;
  multiItemOrderCount: number;
  multiItemOrderRate: number; // percentage 0..100
  topProductByRevenue: { product: string; revenue: number; units: number } | null;
  topProductByUnits: { product: string; units: number; revenue: number } | null;
  topPaymentMethod: { method: string; revenue: number; count: number; sharePct: number } | null;
  dateRange: { min: string; max: string; activeDays: number };
}

export interface ProductPerformance {
  product: string;
  category: ProductCategory;
  unitPrice: number;
  unitsSold: number;
  revenue: number;
  revenueSharePct: number;
  cumulativeRevenuePct: number;
  orderSharePct: number;
  paymentBreakdown: Record<string, { units: number; revenue: number }>;
}

export interface TimeSeriesPoint {
  periodKey: string;
  label: string;
  revenue: number;
  cumulativeRevenue: number;
  units: number;
  orders: number;
  avgOrderValue: number;
  byCategory: Record<ProductCategory, number>;
  byPayment: Record<string, number>;
}

export interface PaymentBreakdownItem {
  method: string;
  revenue: number;
  units: number;
  uniqueOrders: number;
  shareOfRevenuePct: number;
  shareOfUnitsPct: number;
  avgTransactionItemPrice: number;
}

export interface OrderSummary {
  orderNumber: string;
  date: string;
  items: SaleRecord[];
  itemCount: number;
  totalAmount: number;
  paymentMethods: string[];
  hasSplitPayment: boolean;
}

export interface BasketPair {
  pairKey: string;
  productA: string;
  productB: string;
  coOccurrences: number;
  orderNumbers: string[];
  combinedOrderRevenue: number;
}

export interface DayOfWeekMetric {
  dayIndex: number;
  dayName: string;
  shortName: string;
  revenue: number;
  units: number;
  orders: number;
  avgDailyRevenue: number;
}

export interface MatrixCell {
  rowKey: string;
  colKey: string;
  revenue: number;
  units: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function classifyProductCategory(product: string): ProductCategory {
  const lower = product.toLowerCase();
  if (
    lower.includes('tailored') ||
    lower.includes('pleated') ||
    lower.includes('seersucker') ||
    lower.includes('wool dress')
  ) {
    return 'Tailored & Dress';
  }
  if (lower.includes('denim') || lower.includes('canvas') || lower.includes('work') || lower.includes('overalls')) {
    return 'Denim & Workwear';
  }
  if (lower.includes('jogger') || lower.includes('cargo') || lower.includes('short')) {
    return 'Active & Shorts';
  }
  return 'Casual & Chinos';
}

export function classifyPriceTier(price: number): PriceTier {
  if (price < 80) return 'Value (< $80)';
  if (price <= 110) return 'Core ($80–$110)';
  return 'Premium (> $110)';
}

export function parseDateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  return new Date(Date.UTC(y || 2025, (m || 1) - 1, d || 1));
}

export function getMondayOfWeek(dateStr: string): string {
  const dt = parseDateUTC(dateStr);
  const day = dt.getUTCDay(); // 0..6
  const diff = day === 0 ? -6 : 1 - day; // Monday as start of week
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

export function parsePriceValue(rawPrice: string): number {
  const cleaned = rawPrice.replace(/[^0-9.-]+/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

export function createSaleRecord(
  raw: {
    orderNumber: string;
    product: string;
    price: number;
    date: string;
    paymentMethod: string;
  },
  index: number
): SaleRecord {
  const dt = parseDateUTC(raw.date);
  const dayOfWeekIndex = dt.getUTCDay();
  const category = classifyProductCategory(raw.product);
  const priceTier = classifyPriceTier(raw.price);
  return {
    id: `${raw.orderNumber}-${index}-${raw.product.replace(/\s+/g, '-').toLowerCase()}`,
    orderNumber: raw.orderNumber.trim(),
    product: raw.product.trim(),
    price: raw.price,
    date: raw.date.trim(),
    paymentMethod: raw.paymentMethod.trim(),
    category,
    priceTier,
    dayOfWeekIndex,
    dayOfWeekName: DAY_NAMES[dayOfWeekIndex] || 'Monday',
    monthKey: raw.date.trim().slice(0, 7),
    weekKey: getMondayOfWeek(raw.date.trim()),
  };
}

export function parseSalesCsv(csvText: string): {
  records: SaleRecord[];
  errors: string[];
} {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { records: [], errors: ['CSV input is empty.'] };
  }

  const records: SaleRecord[] = [];
  const errors: string[] = [];

  // Detect if first line is header
  const firstLineLower = lines[0].toLowerCase();
  const startIndex =
    firstLineLower.includes('order') && firstLineLower.includes('product') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length < 5) {
      errors.push(`Line ${i + 1}: Expected 5 columns (Order Number, Product, Price, Date, Payment Method).`);
      continue;
    }
    const [orderNumber, product, priceStr, date, paymentMethod] = parts;
    const price = parsePriceValue(priceStr);
    if (!orderNumber || !product || price <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Line ${i + 1}: Invalid values in row "${line}".`);
      continue;
    }
    records.push(
      createSaleRecord(
        {
          orderNumber,
          product,
          price,
          date,
          paymentMethod: paymentMethod || 'Unknown',
        },
        records.length + 1
      )
    );
  }

  return { records, errors };
}

export function getDefaultFilterState(): FilterState {
  return {
    searchQuery: '',
    products: [],
    categories: [],
    paymentMethods: [],
    priceTiers: [],
    dateStart: '',
    dateEnd: '',
    onlyMultiItemOrders: false,
  };
}

export function filterRecords(records: SaleRecord[], filters: FilterState): SaleRecord[] {
  let multiItemOrderSet: Set<string> | null = null;
  if (filters.onlyMultiItemOrders) {
    const counts = new Map<string, number>();
    for (const r of records) {
      counts.set(r.orderNumber, (counts.get(r.orderNumber) || 0) + 1);
    }
    multiItemOrderSet = new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([orderNum]) => orderNum)
    );
  }

  const q = filters.searchQuery.trim().toLowerCase();

  return records.filter((r) => {
    if (filters.products.length > 0 && !filters.products.includes(r.product)) {
      return false;
    }
    if (filters.categories.length > 0 && !filters.categories.includes(r.category)) {
      return false;
    }
    if (filters.paymentMethods.length > 0 && !filters.paymentMethods.includes(r.paymentMethod)) {
      return false;
    }
    if (filters.priceTiers.length > 0 && !filters.priceTiers.includes(r.priceTier)) {
      return false;
    }
    if (filters.dateStart && r.date < filters.dateStart) {
      return false;
    }
    if (filters.dateEnd && r.date > filters.dateEnd) {
      return false;
    }
    if (multiItemOrderSet && !multiItemOrderSet.has(r.orderNumber)) {
      return false;
    }
    if (q) {
      const match =
        r.orderNumber.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.paymentMethod.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.date.includes(q);
      if (!match) return false;
    }
    return true;
  });
}

export function computeKpiSummary(records: SaleRecord[]): KpiSummary {
  if (records.length === 0) {
    return {
      totalRevenue: 0,
      lineItemCount: 0,
      uniqueOrderCount: 0,
      averageOrderValue: 0,
      averageItemPrice: 0,
      multiItemOrderCount: 0,
      multiItemOrderRate: 0,
      topProductByRevenue: null,
      topProductByUnits: null,
      topPaymentMethod: null,
      dateRange: { min: '—', max: '—', activeDays: 0 },
    };
  }

  let totalRevenue = 0;
  const orderTotals = new Map<string, { revenue: number; count: number }>();
  const productTotals = new Map<string, { revenue: number; units: number }>();
  const paymentTotals = new Map<string, { revenue: number; count: number }>();
  const uniqueDates = new Set<string>();

  let minDate = records[0].date;
  let maxDate = records[0].date;

  for (const r of records) {
    totalRevenue += r.price;
    uniqueDates.add(r.date);
    if (r.date < minDate) minDate = r.date;
    if (r.date > maxDate) maxDate = r.date;

    const ord = orderTotals.get(r.orderNumber) || { revenue: 0, count: 0 };
    ord.revenue += r.price;
    ord.count += 1;
    orderTotals.set(r.orderNumber, ord);

    const prod = productTotals.get(r.product) || { revenue: 0, units: 0 };
    prod.revenue += r.price;
    prod.units += 1;
    productTotals.set(r.product, prod);

    const pay = paymentTotals.get(r.paymentMethod) || { revenue: 0, count: 0 };
    pay.revenue += r.price;
    pay.count += 1;
    paymentTotals.set(r.paymentMethod, pay);
  }

  const uniqueOrderCount = orderTotals.size;
  const multiItemOrderCount = Array.from(orderTotals.values()).filter((o) => o.count > 1).length;

  const productsArray = Array.from(productTotals.entries()).map(([product, stats]) => ({
    product,
    revenue: stats.revenue,
    units: stats.units,
  }));

  const byRev = [...productsArray].sort((a, b) => b.revenue - a.revenue || b.units - a.units);
  const byUnits = [...productsArray].sort((a, b) => b.units - a.units || b.revenue - a.revenue);

  const paymentsArray = Array.from(paymentTotals.entries())
    .map(([method, stats]) => ({
      method,
      revenue: stats.revenue,
      count: stats.count,
      sharePct: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    lineItemCount: records.length,
    uniqueOrderCount,
    averageOrderValue: uniqueOrderCount > 0 ? Math.round((totalRevenue / uniqueOrderCount) * 100) / 100 : 0,
    averageItemPrice: Math.round((totalRevenue / records.length) * 100) / 100,
    multiItemOrderCount,
    multiItemOrderRate:
      uniqueOrderCount > 0 ? Math.round((multiItemOrderCount / uniqueOrderCount) * 1000) / 10 : 0,
    topProductByRevenue: byRev[0] || null,
    topProductByUnits: byUnits[0] || null,
    topPaymentMethod: paymentsArray[0] || null,
    dateRange: {
      min: minDate,
      max: maxDate,
      activeDays: uniqueDates.size,
    },
  };
}

export function computeProductPerformance(records: SaleRecord[]): ProductPerformance[] {
  const totalRevenue = records.reduce((acc, r) => acc + r.price, 0);
  const uniqueOrdersTotal = new Set(records.map((r) => r.orderNumber)).size;

  const map = new Map<
    string,
    {
      category: ProductCategory;
      unitPrice: number;
      unitsSold: number;
      revenue: number;
      orders: Set<string>;
      paymentBreakdown: Record<string, { units: number; revenue: number }>;
    }
  >();

  for (const r of records) {
    const existing = map.get(r.product) || {
      category: r.category,
      unitPrice: r.price,
      unitsSold: 0,
      revenue: 0,
      orders: new Set<string>(),
      paymentBreakdown: {},
    };
    existing.unitsSold += 1;
    existing.revenue += r.price;
    existing.orders.add(r.orderNumber);
    const pb = existing.paymentBreakdown[r.paymentMethod] || { units: 0, revenue: 0 };
    pb.units += 1;
    pb.revenue += r.price;
    existing.paymentBreakdown[r.paymentMethod] = pb;
    map.set(r.product, existing);
  }

  const sorted = Array.from(map.entries())
    .map(([product, data]) => ({
      product,
      category: data.category,
      unitPrice: data.unitPrice,
      unitsSold: data.unitsSold,
      revenue: data.revenue,
      revenueSharePct: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      cumulativeRevenuePct: 0,
      orderSharePct: uniqueOrdersTotal > 0 ? (data.orders.size / uniqueOrdersTotal) * 100 : 0,
      paymentBreakdown: data.paymentBreakdown,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold);

  let runningRev = 0;
  for (const item of sorted) {
    runningRev += item.revenue;
    item.cumulativeRevenuePct = totalRevenue > 0 ? (runningRev / totalRevenue) * 100 : 0;
  }

  return sorted;
}

export function computeTimeSeries(
  records: SaleRecord[],
  granularity: 'day' | 'week' | 'month'
): TimeSeriesPoint[] {
  const groups = new Map<
    string,
    {
      revenue: number;
      units: number;
      orders: Set<string>;
      byCategory: Record<ProductCategory, number>;
      byPayment: Record<string, number>;
    }
  >();

  for (const r of records) {
    const key =
      granularity === 'day' ? r.date : granularity === 'week' ? r.weekKey : r.monthKey;

    const g = groups.get(key) || {
      revenue: 0,
      units: 0,
      orders: new Set<string>(),
      byCategory: {
        'Tailored & Dress': 0,
        'Denim & Workwear': 0,
        'Casual & Chinos': 0,
        'Active & Shorts': 0,
      },
      byPayment: {},
    };

    g.revenue += r.price;
    g.units += 1;
    g.orders.add(r.orderNumber);
    g.byCategory[r.category] = (g.byCategory[r.category] || 0) + r.price;
    g.byPayment[r.paymentMethod] = (g.byPayment[r.paymentMethod] || 0) + r.price;
    groups.set(key, g);
  }

  const keys = Array.from(groups.keys()).sort();
  let cumulativeRevenue = 0;

  return keys.map((key) => {
    const g = groups.get(key)!;
    cumulativeRevenue += g.revenue;
    let label = key;
    if (granularity === 'day') {
      const [, m, d] = key.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      label = `${monthNames[Number(m) - 1]} ${Number(d)}`;
    } else if (granularity === 'week') {
      const [, m, d] = key.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      label = `Wk of ${monthNames[Number(m) - 1]} ${Number(d)}`;
    } else {
      const [y, m] = key.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      label = `${monthNames[Number(m) - 1]} ${y}`;
    }

    return {
      periodKey: key,
      label,
      revenue: g.revenue,
      cumulativeRevenue,
      units: g.units,
      orders: g.orders.size,
      avgOrderValue: g.orders.size > 0 ? Math.round((g.revenue / g.orders.size) * 100) / 100 : 0,
      byCategory: g.byCategory,
      byPayment: g.byPayment,
    };
  });
}

export function computePaymentBreakdown(records: SaleRecord[]): PaymentBreakdownItem[] {
  const totalRevenue = records.reduce((s, r) => s + r.price, 0);
  const totalUnits = records.length;

  const map = new Map<
    string,
    { revenue: number; units: number; orders: Set<string> }
  >();

  for (const r of records) {
    const item = map.get(r.paymentMethod) || {
      revenue: 0,
      units: 0,
      orders: new Set<string>(),
    };
    item.revenue += r.price;
    item.units += 1;
    item.orders.add(r.orderNumber);
    map.set(r.paymentMethod, item);
  }

  return Array.from(map.entries())
    .map(([method, stats]) => ({
      method,
      revenue: stats.revenue,
      units: stats.units,
      uniqueOrders: stats.orders.size,
      shareOfRevenuePct: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
      shareOfUnitsPct: totalUnits > 0 ? (stats.units / totalUnits) * 100 : 0,
      avgTransactionItemPrice: stats.units > 0 ? stats.revenue / stats.units : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function computeOrderSummaries(records: SaleRecord[]): OrderSummary[] {
  const map = new Map<string, SaleRecord[]>();
  for (const r of records) {
    const list = map.get(r.orderNumber) || [];
    list.push(r);
    map.set(r.orderNumber, list);
  }

  return Array.from(map.entries())
    .map(([orderNumber, items]) => {
      const totalAmount = items.reduce((s, i) => s + i.price, 0);
      const paymentMethods = Array.from(new Set(items.map((i) => i.paymentMethod)));
      return {
        orderNumber,
        date: items[0].date,
        items,
        itemCount: items.length,
        totalAmount,
        paymentMethods,
        hasSplitPayment: paymentMethods.length > 1,
      };
    })
    .sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));
}

export function computeBasketPairs(records: SaleRecord[]): BasketPair[] {
  const orders = computeOrderSummaries(records);
  const pairMap = new Map<string, BasketPair>();

  for (const order of orders) {
    if (order.items.length < 2) continue;
    const sortedProducts = [...order.items].sort((a, b) => a.product.localeCompare(b.product));
    for (let i = 0; i < sortedProducts.length; i++) {
      for (let j = i + 1; j < sortedProducts.length; j++) {
        const pA = sortedProducts[i].product;
        const pB = sortedProducts[j].product;
        const key = `${pA} + ${pB}`;
        const existing = pairMap.get(key) || {
          pairKey: key,
          productA: pA,
          productB: pB,
          coOccurrences: 0,
          orderNumbers: [],
          combinedOrderRevenue: 0,
        };
        existing.coOccurrences += 1;
        existing.orderNumbers.push(order.orderNumber);
        existing.combinedOrderRevenue += order.totalAmount;
        pairMap.set(key, existing);
      }
    }
  }

  return Array.from(pairMap.values()).sort(
    (a, b) => b.coOccurrences - a.coOccurrences || b.combinedOrderRevenue - a.combinedOrderRevenue
  );
}

export function computeDayOfWeekMetrics(records: SaleRecord[]): DayOfWeekMetric[] {
  // Ordered Monday -> Sunday for retail analytics clarity
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  const stats = new Map<
    number,
    { revenue: number; units: number; orders: Set<string>; dates: Set<string> }
  >();

  for (const idx of dayOrder) {
    stats.set(idx, { revenue: 0, units: 0, orders: new Set(), dates: new Set() });
  }

  for (const r of records) {
    const st = stats.get(r.dayOfWeekIndex)!;
    st.revenue += r.price;
    st.units += 1;
    st.orders.add(r.orderNumber);
    st.dates.add(r.date);
  }

  return dayOrder.map((idx) => {
    const st = stats.get(idx)!;
    const activeDates = Math.max(1, st.dates.size);
    return {
      dayIndex: idx,
      dayName: DAY_NAMES[idx],
      shortName: DAY_SHORT[idx],
      revenue: st.revenue,
      units: st.units,
      orders: st.orders.size,
      avgDailyRevenue: Math.round((st.revenue / activeDates) * 100) / 100,
    };
  });
}

export function computeCrossTabMatrix(
  records: SaleRecord[],
  rowDim: 'product' | 'category' | 'dayOfWeekName' | 'monthKey',
  colDim: 'paymentMethod' | 'category' | 'priceTier' | 'monthKey'
): {
  rows: string[];
  cols: string[];
  cells: Record<string, MatrixCell>;
  maxRevenue: number;
  maxUnits: number;
} {
  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  const cells: Record<string, MatrixCell> = {};

  for (const r of records) {
    const rKey = String(r[rowDim]);
    const cKey = String(r[colDim]);
    rowSet.add(rKey);
    colSet.add(cKey);
    const cellId = `${rKey}:::${cKey}`;
    const cell = cells[cellId] || { rowKey: rKey, colKey: cKey, revenue: 0, units: 0 };
    cell.revenue += r.price;
    cell.units += 1;
    cells[cellId] = cell;
  }

  let maxRevenue = 0;
  let maxUnits = 0;
  for (const cell of Object.values(cells)) {
    if (cell.revenue > maxRevenue) maxRevenue = cell.revenue;
    if (cell.units > maxUnits) maxUnits = cell.units;
  }

  return {
    rows: Array.from(rowSet),
    cols: Array.from(colSet),
    cells,
    maxRevenue,
    maxUnits,
  };
}

export function exportRecordsToCsv(records: SaleRecord[]): string {
  const header = 'Order Number,Product,Price,Date,Payment Method';
  const rows = records.map(
    (r) => `${r.orderNumber},${r.product},$${r.price.toFixed(2)},${r.date},${r.paymentMethod}`
  );
  return [header, ...rows].join('\n');
}
