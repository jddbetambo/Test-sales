import React, { useState } from 'react';
import {
  SaleRecord,
  KpiSummary,
  ProductPerformance,
  PaymentBreakdownItem,
  DayOfWeekMetric,
  computeTimeSeries,
  ProductCategory,
} from '../utils/salesAnalytics';
import { ArrowUpRight, Filter, Calendar, Layers, CreditCard, TrendingUp } from 'lucide-react';

interface OverviewViewProps {
  records: SaleRecord[];
  kpi: KpiSummary;
  products: ProductPerformance[];
  payments: PaymentBreakdownItem[];
  dayMetrics: DayOfWeekMetric[];
  selectedProducts: string[];
  selectedPayments: string[];
  selectedCategories: ProductCategory[];
  onToggleProduct: (product: string) => void;
  onTogglePayment: (method: string) => void;
  onToggleCategory: (cat: ProductCategory) => void;
  onNavigateTab: (tab: 'overview' | 'explorer' | 'baskets' | 'ledger') => void;
}

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  'Tailored & Dress': '#0f172a',
  'Denim & Workwear': '#2563eb',
  'Casual & Chinos': '#0d9488',
  'Active & Shorts': '#d97706',
};

const PAYMENT_COLORS: Record<string, string> = {
  'Credit Card': '#0f172a',
  'eWallet': '#2563eb',
  'Debit Card': '#0d9488',
  'Cash': '#d97706',
};

export const OverviewView: React.FC<OverviewViewProps> = ({
  records,
  kpi,
  products,
  payments,
  dayMetrics,
  selectedProducts,
  selectedPayments,
  selectedCategories,
  onToggleProduct,
  onTogglePayment,
  onToggleCategory,
  onNavigateTab,
}) => {
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week');
  const [timelineMetric, setTimelineMetric] = useState<'revenue' | 'units' | 'orders' | 'cumulative'>('revenue');
  const [hoveredTimeIdx, setHoveredTimeIdx] = useState<number | null>(null);
  const [productSort, setProductSort] = useState<'revenue' | 'units' | 'unitPrice'>('revenue');

  const timeSeries = computeTimeSeries(records, granularity);

  const sortedProducts = [...products].sort((a, b) => {
    if (productSort === 'units') return b.unitsSold - a.unitsSold || b.revenue - a.revenue;
    if (productSort === 'unitPrice') return b.unitPrice - a.unitPrice || b.revenue - a.revenue;
    return b.revenue - a.revenue;
  });

  // Compute category totals
  const categoryMap = new Map<ProductCategory, { revenue: number; units: number }>();
  for (const r of records) {
    const cur = categoryMap.get(r.category) || { revenue: 0, units: 0 };
    cur.revenue += r.price;
    cur.units += 1;
    categoryMap.set(r.category, cur);
  }
  const categoryList = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      revenue: stats.revenue,
      units: stats.units,
      sharePct: kpi.totalRevenue > 0 ? (stats.revenue / kpi.totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // SVG Chart dimensions for Time Series
  const chartW = 760;
  const chartH = 250;
  const padL = 56;
  const padR = 24;
  const padT = 20;
  const padB = 38;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const metricValues = timeSeries.map((pt) =>
    timelineMetric === 'revenue'
      ? pt.revenue
      : timelineMetric === 'units'
      ? pt.units
      : timelineMetric === 'orders'
      ? pt.orders
      : pt.cumulativeRevenue
  );
  const maxVal = Math.max(1, ...metricValues);

  const maxDayRev = Math.max(1, ...dayMetrics.map((d) => d.revenue));

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <section aria-label="Key Performance Metrics" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-black border border-neutral-800 rounded-lg p-4 text-white">
          <div className="text-xs font-medium text-neutral-400">Total Revenue</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-white" data-testid="kpi-total-revenue">
            ${kpi.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-neutral-400 flex items-center gap-1">
            <span>{kpi.dateRange.activeDays} active days</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              ${kpi.dateRange.activeDays > 0 ? (kpi.totalRevenue / kpi.dateRange.activeDays).toFixed(0) : 0}/day
            </span>
          </div>
        </div>

        <div className="bg-black border border-neutral-800 rounded-lg p-4 text-white">
          <div className="text-xs font-medium text-neutral-400">Unique Orders</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-white" data-testid="kpi-unique-orders">
            {kpi.uniqueOrderCount.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-neutral-400 flex items-center gap-1">
            <span className="font-mono tabular-nums">{kpi.multiItemOrderCount}</span>
            <span>multi-item ({kpi.multiItemOrderRate.toFixed(1)}%)</span>
          </div>
        </div>

        <div className="bg-black border border-neutral-800 rounded-lg p-4 text-white">
          <div className="text-xs font-medium text-neutral-400">Line Items Sold</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-white" data-testid="kpi-line-items">
            {kpi.lineItemCount.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-neutral-400 flex items-center gap-1">
            <span>Across {products.length} SKU models</span>
          </div>
        </div>

        <div className="bg-black border border-neutral-800 rounded-lg p-4 text-white">
          <div className="text-xs font-medium text-neutral-400">Avg Order Value (AOV)</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-white" data-testid="kpi-aov">
            ${kpi.averageOrderValue.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-neutral-400 flex items-center gap-1">
            <span>Avg item</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">${kpi.averageItemPrice.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-black border border-neutral-800 rounded-lg p-4 text-white">
          <div className="text-xs font-medium text-neutral-400">Top Revenue SKU</div>
          <div className="mt-1.5 text-sm font-semibold text-white truncate" title={kpi.topProductByRevenue?.product || '—'}>
            {kpi.topProductByRevenue?.product || '—'}
          </div>
          <div className="mt-1 text-xs text-neutral-400 flex items-center gap-1 font-mono tabular-nums">
            <span>${kpi.topProductByRevenue?.revenue.toLocaleString() || '0'}</span>
            <span aria-hidden="true">·</span>
            <span>{kpi.topProductByRevenue?.units || 0} units</span>
          </div>
        </div>

        <div className="bg-black border border-neutral-800 rounded-lg p-4 text-white">
          <div className="text-xs font-medium text-neutral-400">Leading Tender</div>
          <div className="mt-1.5 text-base font-bold text-white truncate">
            {kpi.topPaymentMethod?.method || '—'}
          </div>
          <div className="mt-1 text-xs text-neutral-400 flex items-center gap-1 font-mono tabular-nums">
            <span>${kpi.topPaymentMethod?.revenue.toLocaleString() || '0'}</span>
            <span aria-hidden="true">·</span>
            <span>{kpi.topPaymentMethod?.sharePct.toFixed(1) || '0'}%</span>
          </div>
        </div>
      </section>

      {/* Row 1: Time Series Trajectory + Payment & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Time-Series Trajectory */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Sales Trajectory & Cumulative Velocity
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Period performance from {kpi.dateRange.min} to {kpi.dateRange.max}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Metric Selector */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md" role="group" aria-label="Timeline Metric">
                  {(['revenue', 'units', 'orders', 'cumulative'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTimelineMetric(m)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        timelineMetric === m
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {m === 'revenue'
                        ? 'Revenue ($)'
                        : m === 'units'
                        ? 'Units'
                        : m === 'orders'
                        ? 'Orders'
                        : 'Cumulative ($)'}
                    </button>
                  ))}
                </div>

                {/* Granularity Selector */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md" role="group" aria-label="Time Granularity">
                  {(['day', 'week', 'month'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGranularity(g)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        granularity === g
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {g === 'day' ? 'Daily' : g === 'week' ? 'Weekly' : 'Monthly'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive SVG Chart */}
            <div className="mt-4 relative">
              {timeSeries.length === 0 ? (
                <div className="h-60 flex items-center justify-center text-sm text-slate-500">
                  No time-series data for current filter selection.
                </div>
              ) : (
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full h-64 overflow-visible"
                  role="img"
                  aria-label="Sales Time Series Chart"
                >
                  {/* Horizontal Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padT + innerH * (1 - ratio);
                    const val = Math.round(maxVal * ratio);
                    return (
                      <g key={ratio}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={chartW - padR}
                          y2={y}
                          stroke="currentColor"
                          className="text-slate-100 dark:text-slate-800"
                          strokeWidth="1"
                        />
                        <text
                          x={padL - 8}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                        >
                          {timelineMetric === 'revenue' || timelineMetric === 'cumulative'
                            ? `$${val.toLocaleString()}`
                            : val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars or Area/Line */}
                  {timeSeries.map((pt, i) => {
                    const count = timeSeries.length;
                    const slotW = innerW / count;
                    const barW = Math.min(42, Math.max(6, slotW * 0.68));
                    const xCenter = padL + i * slotW + slotW / 2;
                    const val = metricValues[i];
                    const barH = (val / maxVal) * innerH;
                    const yTop = padT + innerH - barH;
                    const isHovered = hoveredTimeIdx === i;

                    const showLabel =
                      count <= 12 ||
                      i === 0 ||
                      i === count - 1 ||
                      i % Math.ceil(count / 8) === 0;

                    return (
                      <g
                        key={pt.periodKey}
                        onMouseEnter={() => setHoveredTimeIdx(i)}
                        onMouseLeave={() => setHoveredTimeIdx(null)}
                        className="cursor-pointer"
                      >
                        {/* Invisible hover hit column */}
                        <rect
                          x={padL + i * slotW}
                          y={padT}
                          width={slotW}
                          height={innerH}
                          fill="transparent"
                        />
                        {/* Bar */}
                        <rect
                          x={xCenter - barW / 2}
                          y={yTop}
                          width={barW}
                          height={Math.max(2, barH)}
                          rx={2}
                          className={`transition-opacity ${
                            isHovered
                              ? 'fill-blue-600 dark:fill-blue-400'
                              : timelineMetric === 'cumulative'
                              ? 'fill-teal-600/85 dark:fill-teal-500/80'
                              : 'fill-slate-900 dark:fill-slate-200'
                          }`}
                        />
                        {showLabel && (
                          <text
                            x={xCenter}
                            y={chartH - 12}
                            textAnchor="middle"
                            className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
                          >
                            {pt.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Hover Readout Bar */}
              <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                {hoveredTimeIdx !== null && timeSeries[hoveredTimeIdx] ? (
                  <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {timeSeries[hoveredTimeIdx].label} ({timeSeries[hoveredTimeIdx].periodKey})
                    </span>
                    <span>·</span>
                    <span>
                      Revenue: <strong>${timeSeries[hoveredTimeIdx].revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Units: <strong>{timeSeries[hoveredTimeIdx].units}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Orders: <strong>{timeSeries[hoveredTimeIdx].orders}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Cumulative: <strong>${timeSeries[hoveredTimeIdx].cumulativeRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </span>
                  </div>
                ) : (
                  <span>Hover over any bar to inspect exact period revenue, order count, and cumulative trajectory.</span>
                )}
                <button
                  type="button"
                  onClick={() => onNavigateTab('explorer')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                >
                  <span>Open in Visual Studio</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Methods & Apparel Category Interactive Breakdown */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-6">
          {/* Payment Methods */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Payment Method Split
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click any tender to filter dashboard
                </p>
              </div>
              <CreditCard className="w-4 h-4 text-slate-400" />
            </div>

            {/* Stacked Horizontal Bar */}
            <div className="mt-4 h-3 w-full rounded-sm overflow-hidden flex bg-slate-100 dark:bg-slate-800">
              {payments.map((pm) => (
                <div
                  key={pm.method}
                  style={{
                    width: `${pm.shareOfRevenuePct}%`,
                    backgroundColor: PAYMENT_COLORS[pm.method] || '#64748b',
                  }}
                  title={`${pm.method}: $${pm.revenue.toFixed(2)} (${pm.shareOfRevenuePct.toFixed(1)}%)`}
                  className="h-full transition-all first:rounded-l-sm last:rounded-r-sm"
                />
              ))}
            </div>

            <div className="mt-3 space-y-2">
              {payments.map((pm) => {
                const isSelected = selectedPayments.includes(pm.method);
                return (
                  <button
                    key={pm.method}
                    type="button"
                    onClick={() => onTogglePayment(pm.method)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                        : 'bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: isSelected ? 'currentColor' : PAYMENT_COLORS[pm.method] || '#64748b' }}
                      />
                      <span className="text-xs font-medium truncate">{pm.method}</span>
                      <span className={`text-[11px] font-mono tabular-nums ${isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'}`}>
                        {pm.units} items
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-nums text-xs shrink-0">
                      <span className="font-semibold">${pm.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      <span className={`w-12 text-right ${isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500'}`}>
                        {pm.shareOfRevenuePct.toFixed(1)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Category Split */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Apparel Department Share
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click category to isolate segment
                </p>
              </div>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-2">
              {categoryList.map((cat) => {
                const isSelected = selectedCategories.includes(cat.category);
                return (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() => onToggleCategory(cat.category)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-left transition-colors border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-xs shrink-0"
                        style={{ backgroundColor: isSelected ? '#ffffff' : CATEGORY_COLORS[cat.category] }}
                      />
                      <span className="text-xs font-medium truncate">{cat.category}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-nums text-xs shrink-0">
                      <span>${cat.revenue.toLocaleString()}</span>
                      <span className={isSelected ? 'text-blue-100' : 'text-slate-400'}>·</span>
                      <span className={`w-11 text-right ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {cat.sharePct.toFixed(1)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Product Revenue & Pareto Ranking + Day-of-Week Trading Rhythm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Product Performance Table & Bar Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                SKU Revenue & Volume Ranking
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Click any product row to cross-filter all charts
              </p>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md" role="group" aria-label="Sort Products">
              {(['revenue', 'units', 'unitPrice'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setProductSort(s)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    productSort === s
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {s === 'revenue' ? 'By Revenue' : s === 'units' ? 'By Units' : 'By Unit Price'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            {sortedProducts.map((prod, idx) => {
              const maxProdRev = Math.max(1, sortedProducts[0]?.revenue || 1);
              const maxProdUnits = Math.max(1, ...sortedProducts.map((p) => p.unitsSold));
              const barPct =
                productSort === 'units'
                  ? (prod.unitsSold / maxProdUnits) * 100
                  : (prod.revenue / maxProdRev) * 100;
              const isSelected = selectedProducts.includes(prod.product);

              return (
                <button
                  key={prod.product}
                  type="button"
                  onClick={() => onToggleProduct(prod.product)}
                  className={`w-full group relative rounded-md px-3 py-2 text-left transition-colors border ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-xs relative z-10">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono tabular-nums text-slate-400 w-5 shrink-0">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {prod.product}
                      </span>
                      <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                        · ${prod.unitPrice.toFixed(0)}/ea
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                      <span className="text-slate-500 dark:text-slate-400">
                        {prod.unitsSold} sold
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 w-20 text-right">
                        ${prod.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-slate-400 w-11 text-right">
                        {prod.revenueSharePct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {/* Subtle progress bar */}
                  <div className="mt-1.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs overflow-hidden">
                    <div
                      className="h-full rounded-xs transition-all"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor: CATEGORY_COLORS[prod.category],
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day-of-Week Trading Rhythm */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Day-of-Week Trading Rhythm
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Aggregate revenue and unit velocity by weekday
                </p>
              </div>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>

            <div className="mt-4 space-y-3">
              {dayMetrics.map((dm) => {
                const pct = (dm.revenue / maxDayRev) * 100;
                return (
                  <div key={dm.dayName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200 w-24">
                        {dm.dayName}
                      </span>
                      <div className="flex items-center gap-3 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        <span>{dm.units} items</span>
                        <span>·</span>
                        <span>{dm.orders} orders</span>
                        <span>·</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 w-20 text-right">
                          ${dm.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs overflow-hidden">
                      <div
                        className="h-full bg-slate-800 dark:bg-slate-300 rounded-xs transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Monthly Cohort Breakdown to balance vertical density */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2.5">
                Monthly Cohort Breakdown
              </h3>
              <div className="space-y-2">
                {computeTimeSeries(records, 'month').map((m) => (
                  <div
                    key={m.periodKey}
                    className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-md"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {m.label}
                    </span>
                    <div className="flex items-center gap-2.5 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      <span>{m.orders} orders</span>
                      <span>·</span>
                      <span>{m.units} units</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 w-20 text-right">
                        ${m.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insight Summary Footer inside card */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              <span>Multi-item basket rate: </span>
              <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {kpi.multiItemOrderRate.toFixed(1)}% ({kpi.multiItemOrderCount} of {kpi.uniqueOrderCount} orders)
              </strong>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('baskets')}
              className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
            >
              <span>Inspect Basket Pairs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
