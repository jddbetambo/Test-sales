import React, { useState, useMemo } from 'react';
import {
  SaleRecord,
  ProductPerformance,
  computeCrossTabMatrix,
  ProductCategory,
} from '../utils/salesAnalytics';
import {
  BarChart3,
  Grid,
  PieChart,
  TrendingUp,
  ScatterChart,
  Layers,
  LayoutGrid,
  SlidersHorizontal,
} from 'lucide-react';

interface VisualExplorerViewProps {
  records: SaleRecord[];
  products: ProductPerformance[];
  onToggleProduct: (product: string) => void;
  onTogglePayment: (method: string) => void;
}

export type ChartMode =
  | 'pareto'
  | 'stacked_bar'
  | 'heatmap'
  | 'treemap'
  | 'scatter'
  | 'donut'
  | 'cumulative_area'
  | 'price_distribution';

type PrimaryDim = 'product' | 'category' | 'paymentMethod' | 'priceTier' | 'dayOfWeekName' | 'monthKey';
type SecondaryDim = 'paymentMethod' | 'category' | 'priceTier' | 'monthKey';
type MetricType = 'revenue' | 'units' | 'orders' | 'avgValue';

const PALETTE = [
  '#0f172a',
  '#2563eb',
  '#0d9488',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#059669',
  '#dc2626',
];

const CATEGORY_HEX: Record<ProductCategory, string> = {
  'Tailored & Dress': '#0f172a',
  'Denim & Workwear': '#2563eb',
  'Casual & Chinos': '#0d9488',
  'Active & Shorts': '#d97706',
};

export const VisualExplorerView: React.FC<VisualExplorerViewProps> = ({
  records,
  products,
  onToggleProduct,
  onTogglePayment,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('pareto');
  const [primaryDim, setPrimaryDim] = useState<PrimaryDim>('product');
  const [secondaryDim, setSecondaryDim] = useState<SecondaryDim>('paymentMethod');
  const [metric, setMetric] = useState<MetricType>('revenue');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Aggregate by primaryDim and secondaryDim
  const aggregated = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        revenue: number;
        units: number;
        orders: Set<string>;
        subGroups: Record<string, { revenue: number; units: number }>;
      }
    >();

    for (const r of records) {
      const pKey = String(r[primaryDim]);
      const sKey = String(r[secondaryDim]);

      const g = groups.get(pKey) || {
        key: pKey,
        revenue: 0,
        units: 0,
        orders: new Set<string>(),
        subGroups: {},
      };
      g.revenue += r.price;
      g.units += 1;
      g.orders.add(r.orderNumber);

      const sg = g.subGroups[sKey] || { revenue: 0, units: 0 };
      sg.revenue += r.price;
      sg.units += 1;
      g.subGroups[sKey] = sg;

      groups.set(pKey, g);
    }

    const list = Array.from(groups.values()).map((g) => {
      const ordersCount = g.orders.size;
      const avgValue = g.units > 0 ? g.revenue / g.units : 0;
      const val =
        metric === 'revenue'
          ? g.revenue
          : metric === 'units'
          ? g.units
          : metric === 'orders'
          ? ordersCount
          : avgValue;

      return {
        ...g,
        ordersCount,
        avgValue,
        value: val,
      };
    });

    list.sort((a, b) => b.value - a.value);

    const totalVal = list.reduce((s, item) => s + item.value, 0);
    let running = 0;
    return list.map((item) => {
      running += item.value;
      return {
        ...item,
        sharePct: totalVal > 0 ? (item.value / totalVal) * 100 : 0,
        cumulativePct: totalVal > 0 ? (running / totalVal) * 100 : 0,
      };
    });
  }, [records, primaryDim, secondaryDim, metric]);

  const secondaryKeys = useMemo(() => {
    const s = new Set<string>();
    for (const r of records) {
      s.add(String(r[secondaryDim]));
    }
    return Array.from(s);
  }, [records, secondaryDim]);

  const matrix = useMemo(
    () =>
      computeCrossTabMatrix(
        records,
        primaryDim === 'paymentMethod' || primaryDim === 'priceTier' ? 'product' : primaryDim,
        secondaryDim
      ),
    [records, primaryDim, secondaryDim]
  );

  const chartModes: { id: ChartMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'pareto',
      label: 'Pareto Curve',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      desc: 'Ranked vertical bars paired with an 80/20 cumulative concentration curve.',
    },
    {
      id: 'stacked_bar',
      label: 'Stacked Bar',
      icon: <Layers className="w-3.5 h-3.5" />,
      desc: 'Multi-dimensional horizontal bars segmented by secondary attribute.',
    },
    {
      id: 'heatmap',
      label: 'Matrix Heatmap',
      icon: <Grid className="w-3.5 h-3.5" />,
      desc: '2D matrix intersection showing exact revenue and unit intensity.',
    },
    {
      id: 'treemap',
      label: 'Treemap',
      icon: <LayoutGrid className="w-3.5 h-3.5" />,
      desc: 'Area-proportional tiles scaled to SKU or category contribution.',
    },
    {
      id: 'scatter',
      label: 'Bubble Plot',
      icon: <ScatterChart className="w-3.5 h-3.5" />,
      desc: 'Unit price (X) vs. Units sold (Y) with bubble area scaled to total revenue.',
    },
    {
      id: 'donut',
      label: 'Radial Donut',
      icon: <PieChart className="w-3.5 h-3.5" />,
      desc: 'Proportional ring geometry paired with a precision tabular breakdown.',
    },
  ];

  const formatValue = (v: number) => {
    if (metric === 'revenue' || metric === 'avgValue') {
      return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return v.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Studio Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Multi-View Visualization Studio</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Switch chart geometries, pivot dimensions, and change target metrics in real time
            </p>
          </div>

          {/* 6 Chart Type Buttons */}
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Visualization Type">
            {chartModes.map((cm) => (
              <button
                key={cm.id}
                type="button"
                role="tab"
                aria-selected={chartMode === cm.id}
                onClick={() => setChartMode(cm.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                  chartMode === cm.id
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {cm.icon}
                <span>{cm.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Axis & Dimension Controls */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="select-primary-dim" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Primary Dimension (X-Axis / Group)
            </label>
            <select
              id="select-primary-dim"
              value={primaryDim}
              onChange={(e) => setPrimaryDim(e.target.value as PrimaryDim)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="product">Product (12 Apparel SKUs)</option>
              <option value="category">Apparel Category (4 Departments)</option>
              <option value="paymentMethod">Payment Method (4 Tenders)</option>
              <option value="priceTier">Price Tier (Value / Core / Premium)</option>
              <option value="dayOfWeekName">Day of Week (Mon–Sun)</option>
              <option value="monthKey">Calendar Month (Aug–Oct 2025)</option>
            </select>
          </div>

          <div>
            <label htmlFor="select-secondary-dim" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Secondary Split / Matrix Column
            </label>
            <select
              id="select-secondary-dim"
              value={secondaryDim}
              onChange={(e) => setSecondaryDim(e.target.value as SecondaryDim)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="paymentMethod">Payment Method</option>
              <option value="category">Apparel Category</option>
              <option value="priceTier">Price Tier</option>
              <option value="monthKey">Calendar Month</option>
            </select>
          </div>

          <div>
            <label htmlFor="select-metric" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Target Quantitative Metric (Y-Axis)
            </label>
            <select
              id="select-metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricType)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="revenue">Total Revenue ($)</option>
              <option value="units">Line Items Sold (Units)</option>
              <option value="orders">Unique Orders Count</option>
              <option value="avgValue">Average Unit Price ($)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Chart Canvas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {chartModes.find((c) => c.id === chartMode)?.label} —{' '}
              <span className="text-slate-500 font-normal">
                {chartModes.find((c) => c.id === chartMode)?.desc}
              </span>
            </h3>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500">
            Showing {records.length} line items across {aggregated.length} groups
          </div>
        </div>

        {/* 1. PARETO & CUMULATIVE CURVE */}
        {chartMode === 'pareto' && (
          <div>
            {aggregated.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-slate-500">
                No matching records.
              </div>
            ) : (
              (() => {
                const w = 920;
                const h = 340;
                const padL = 64;
                const padR = 54;
                const padT = 24;
                const padB = 85;
                const innerW = w - padL - padR;
                const innerH = h - padT - padB;
                const maxV = Math.max(1, ...aggregated.map((a) => a.value));
                const slotW = innerW / aggregated.length;

                const linePoints = aggregated
                  .map((a, i) => {
                    const x = padL + i * slotW + slotW / 2;
                    const y = padT + innerH * (1 - a.cumulativePct / 100);
                    return `${x},${y}`;
                  })
                  .join(' ');

                return (
                  <div className="space-y-4">
                    <svg
                      viewBox={`0 0 ${w} ${h}`}
                      className="w-full h-80 overflow-visible"
                      role="img"
                      aria-label="Pareto Chart"
                    >
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((r) => {
                        const y = padT + innerH * (1 - r);
                        return (
                          <g key={r}>
                            <line
                              x1={padL}
                              y1={y}
                              x2={w - padR}
                              y2={y}
                              stroke="currentColor"
                              className="text-slate-100 dark:text-slate-800"
                            />
                            <text
                              x={padL - 8}
                              y={y + 4}
                              textAnchor="end"
                              className="fill-slate-400 text-[10px] font-mono tabular-nums"
                            >
                              {metric === 'revenue' || metric === 'avgValue'
                                ? `$${Math.round(maxV * r).toLocaleString()}`
                                : Math.round(maxV * r)}
                            </text>
                            <text
                              x={w - padR + 8}
                              y={y + 4}
                              textAnchor="start"
                              className="fill-blue-600 dark:fill-blue-400 text-[10px] font-mono tabular-nums"
                            >
                              {Math.round(r * 100)}%
                            </text>
                          </g>
                        );
                      })}

                      {/* Bars */}
                      {aggregated.map((item, i) => {
                        const barW = Math.min(48, Math.max(12, slotW * 0.62));
                        const x = padL + i * slotW + slotW / 2 - barW / 2;
                        const barH = (item.value / maxV) * innerH;
                        const y = padT + innerH - barH;
                        const isHov = hoveredKey === item.key;

                        return (
                          <g
                            key={item.key}
                            onMouseEnter={() => setHoveredKey(item.key)}
                            onMouseLeave={() => setHoveredKey(null)}
                            onClick={() => {
                              if (primaryDim === 'product') onToggleProduct(item.key);
                              if (primaryDim === 'paymentMethod') onTogglePayment(item.key);
                            }}
                            className="cursor-pointer"
                          >
                            <rect
                              x={x}
                              y={y}
                              width={barW}
                              height={Math.max(2, barH)}
                              rx={3}
                              className={
                                isHov
                                  ? 'fill-blue-600 dark:fill-blue-400'
                                  : 'fill-slate-900 dark:fill-slate-200'
                              }
                            />
                            <text
                              x={x + barW / 2}
                              y={padT + innerH + 16}
                              textAnchor="end"
                              transform={`rotate(-28, ${x + barW / 2}, ${padT + innerH + 16})`}
                              className="fill-slate-600 dark:fill-slate-400 text-[10px] font-medium"
                            >
                              {item.key.length > 22 ? `${item.key.slice(0, 20)}…` : item.key}
                            </text>
                          </g>
                        );
                      })}

                      {/* Cumulative Pareto Line */}
                      <polyline
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.5"
                        points={linePoints}
                      />
                      {aggregated.map((item, i) => {
                        const cx = padL + i * slotW + slotW / 2;
                        const cy = padT + innerH * (1 - item.cumulativePct / 100);
                        return (
                          <circle
                            key={item.key}
                            cx={cx}
                            cy={cy}
                            r={4}
                            className="fill-white dark:fill-slate-900 stroke-blue-600 dark:stroke-blue-400"
                            strokeWidth="2.5"
                          >
                            <title>{`${item.key}: ${formatValue(item.value)} (Cumulative: ${item.cumulativePct.toFixed(1)}%)`}</title>
                          </circle>
                        );
                      })}

                      {/* Bar Value Labels rendered on top with clean white halo for legibility */}
                      {aggregated.map((item, i) => {
                        const barW = Math.min(48, Math.max(12, slotW * 0.62));
                        const x = padL + i * slotW + slotW / 2 - barW / 2;
                        const barH = (item.value / maxV) * innerH;
                        const y = padT + innerH - barH;
                        return (
                          <text
                            key={`lbl-${item.key}`}
                            x={x + barW / 2}
                            y={y - 7}
                            textAnchor="middle"
                            style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: '4px', strokeLinejoin: 'round' }}
                            className="fill-slate-700 dark:fill-slate-200 text-[10px] font-semibold font-mono tabular-nums pointer-events-none"
                          >
                            {metric === 'revenue' || metric === 'avgValue'
                              ? `$${Math.round(item.value)}`
                              : item.value}
                          </text>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* 2. STACKED COMPOSITION BAR */}
        {chartMode === 'stacked_bar' && (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 pb-2">
              {secondaryKeys.map((sk, idx) => (
                <div key={sk} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <span
                    className="w-3 h-3 rounded-xs"
                    style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                  />
                  <span>{sk}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {aggregated.map((row) => {
                const maxRowVal = Math.max(1, aggregated[0]?.value || 1);
                const rowWidthPct = (row.value / maxRowVal) * 100;

                return (
                  <div key={row.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {row.key}
                      </span>
                      <div className="flex items-center gap-3 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        <span>{row.units} units</span>
                        <span>·</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatValue(row.value)}
                        </span>
                        <span className="w-12 text-right text-slate-400">
                          {row.sharePct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-sm overflow-hidden">
                      <div
                        className="h-full flex transition-all"
                        style={{ width: `${Math.max(4, rowWidthPct)}%` }}
                      >
                        {secondaryKeys.map((sk, idx) => {
                          const sub = row.subGroups[sk];
                          if (!sub) return null;
                          const subVal = metric === 'units' ? sub.units : sub.revenue;
                          const totalSub = secondaryKeys.reduce((acc, k) => {
                            const s = row.subGroups[k];
                            return acc + (s ? (metric === 'units' ? s.units : s.revenue) : 0);
                          }, 0);
                          const pct = totalSub > 0 ? (subVal / totalSub) * 100 : 0;
                          return (
                            <div
                              key={sk}
                              style={{
                                width: `${pct}%`,
                                backgroundColor: PALETTE[idx % PALETTE.length],
                              }}
                              title={`${row.key} — ${sk}: $${sub.revenue.toFixed(2)} (${sub.units} units)`}
                              className="h-full border-r border-white/20 last:border-r-0"
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. CROSS-TAB HEATMAP MATRIX */}
        {chartMode === 'heatmap' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-3">Dimension Intersection</th>
                  {matrix.cols.map((col) => (
                    <th key={col} className="py-2.5 px-3 text-right">
                      {col}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">Row Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {matrix.rows.map((rKey) => {
                  let rowRev = 0;
                  let rowUnits = 0;
                  return (
                    <tr key={rKey} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {rKey}
                      </td>
                      {matrix.cols.map((cKey) => {
                        const cell = matrix.cells[`${rKey}:::${cKey}`];
                        const rev = cell?.revenue || 0;
                        const units = cell?.units || 0;
                        rowRev += rev;
                        rowUnits += units;
                        const intensity =
                          matrix.maxRevenue > 0 ? Math.min(1, rev / matrix.maxRevenue) : 0;
                        return (
                          <td key={cKey} className="p-1.5 text-right font-mono tabular-nums">
                            {rev > 0 ? (
                              <div
                                className="rounded px-2.5 py-1.5 transition-colors"
                                style={{
                                  backgroundColor: `rgba(37, 99, 235, ${0.08 + intensity * 0.78})`,
                                  color: intensity > 0.55 ? '#ffffff' : 'inherit',
                                }}
                              >
                                <div className="font-semibold">${rev.toLocaleString()}</div>
                                <div className="text-[10px] opacity-80">{units} units</div>
                              </div>
                            ) : (
                              <div className="px-2.5 py-1.5 text-slate-300 dark:text-slate-700">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        <div>${rowRev.toLocaleString()}</div>
                        <div className="text-[10px] font-normal text-slate-500">{rowUnits} units</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. PROPORTIONAL TREEMAP */}
        {chartMode === 'treemap' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {aggregated.map((item, idx) => {
              const isLarge = idx < 2;
              const isMedium = idx >= 2 && idx < 6;
              return (
                <div
                  key={item.key}
                  onClick={() => {
                    if (primaryDim === 'product') onToggleProduct(item.key);
                    if (primaryDim === 'paymentMethod') onTogglePayment(item.key);
                  }}
                  style={{
                    backgroundColor: PALETTE[idx % PALETTE.length],
                  }}
                  className={`cursor-pointer rounded-lg p-4 text-white flex flex-col justify-between transition-transform hover:scale-[1.01] ${
                    isLarge
                      ? 'sm:col-span-2 min-h-[140px]'
                      : isMedium
                      ? 'min-h-[120px]'
                      : 'min-h-[100px]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold leading-snug">{item.key}</span>
                    <span className="text-xs font-mono tabular-nums opacity-85 shrink-0">
                      {item.sharePct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-4 font-mono tabular-nums">
                    <div className="text-lg font-bold">{formatValue(item.value)}</div>
                    <div className="text-[11px] opacity-80">
                      {item.units} units · {item.ordersCount} orders
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. PRICE VS VOLUME SCATTER / BUBBLE PLOT */}
        {chartMode === 'scatter' && (
          <div>
            {(() => {
              const w = 880;
              const h = 340;
              const padL = 64;
              const padR = 40;
              const padT = 30;
              const padB = 50;
              const innerW = w - padL - padR;
              const innerH = h - padT - padB;

              const minPrice = 40;
              const maxPrice = 190;
              const maxUnits = Math.max(16, ...products.map((p) => p.unitsSold + 2));
              const maxRev = Math.max(1, ...products.map((p) => p.revenue));

              return (
                <div className="space-y-4">
                  <svg
                    viewBox={`0 0 ${w} ${h}`}
                    className="w-full h-80 overflow-visible"
                    role="img"
                    aria-label="Price vs Units Sold Bubble Plot"
                  >
                    {/* Grid */}
                    {[0, 0.25, 0.5, 0.75, 1].map((r) => {
                      const y = padT + innerH * (1 - r);
                      const uVal = Math.round(maxUnits * r);
                      return (
                        <g key={r}>
                          <line
                            x1={padL}
                            y1={y}
                            x2={w - padR}
                            y2={y}
                            stroke="currentColor"
                            className="text-slate-100 dark:text-slate-800"
                          />
                          <text
                            x={padL - 10}
                            y={y + 4}
                            textAnchor="end"
                            className="fill-slate-400 text-[10px] font-mono tabular-nums"
                          >
                            {uVal} units
                          </text>
                        </g>
                      );
                    })}

                    {[50, 75, 100, 125, 150, 175].map((pVal) => {
                      const x = padL + ((pVal - minPrice) / (maxPrice - minPrice)) * innerW;
                      return (
                        <g key={pVal}>
                          <line
                            x1={x}
                            y1={padT}
                            x2={x}
                            y2={padT + innerH}
                            stroke="currentColor"
                            className="text-slate-100 dark:text-slate-800"
                          />
                          <text
                            x={x}
                            y={h - 14}
                            textAnchor="middle"
                            className="fill-slate-500 text-[10px] font-mono tabular-nums"
                          >
                            ${pVal}
                          </text>
                        </g>
                      );
                    })}

                    {/* Bubbles */}
                    {products.map((prod) => {
                      const cx =
                        padL + ((prod.unitPrice - minPrice) / (maxPrice - minPrice)) * innerW;
                      const cy = padT + innerH * (1 - prod.unitsSold / maxUnits);
                      const radius = 8 + Math.sqrt(prod.revenue / maxRev) * 18;
                      const color = CATEGORY_HEX[prod.category];

                      return (
                        <g
                          key={prod.product}
                          onClick={() => onToggleProduct(prod.product)}
                          className="cursor-pointer group"
                        >
                          <circle
                            cx={cx}
                            cy={cy}
                            r={radius}
                            fill={color}
                            fillOpacity={0.78}
                            stroke={color}
                            strokeWidth="2"
                          >
                            <title>{`${prod.product} — Unit Price: $${prod.unitPrice}, Sold: ${prod.unitsSold}, Total Revenue: $${prod.revenue}`}</title>
                          </circle>
                          <text
                            x={cx}
                            y={cy - radius - 5}
                            textAnchor="middle"
                            className="fill-slate-700 dark:fill-slate-200 text-[10px] font-medium"
                          >
                            {prod.product.split(' ').slice(0, 2).join(' ')}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-4">
                      {(Object.keys(CATEGORY_HEX) as ProductCategory[]).map((cat) => (
                        <div key={cat} className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: CATEGORY_HEX[cat] }}
                          />
                          <span>{cat}</span>
                        </div>
                      ))}
                    </div>
                    <span>X-Axis: Unit Price ($) · Y-Axis: Units Sold · Bubble Size: Total Revenue ($)</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 6. RADIAL DONUT & PRECISION LEDGER */}
        {chartMode === 'donut' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-5 flex justify-center">
              {(() => {
                const size = 240;
                const stroke = 34;
                const radius = (size - stroke) / 2;
                const circumference = 2 * Math.PI * radius;
                let accumulatedPct = 0;

                const totalVal = aggregated.reduce((s, a) => s + a.value, 0);

                return (
                  <div className="relative inline-flex items-center justify-center">
                    <svg width={size} height={size} className="-rotate-90">
                      {aggregated.map((item, idx) => {
                        const pct = item.sharePct / 100;
                        const dash = pct * circumference;
                        const offset = -accumulatedPct * circumference;
                        accumulatedPct += pct;
                        return (
                          <circle
                            key={item.key}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="transparent"
                            stroke={PALETTE[idx % PALETTE.length]}
                            strokeWidth={stroke}
                            strokeDasharray={`${dash} ${circumference}`}
                            strokeDashoffset={offset}
                          >
                            <title>{`${item.key}: ${formatValue(item.value)} (${item.sharePct.toFixed(1)}%)`}</title>
                          </circle>
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Total {metric}
                      </span>
                      <span className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                        {formatValue(totalVal)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="md:col-span-7">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                    <th className="py-2">Segment</th>
                    <th className="py-2 text-right">Units</th>
                    <th className="py-2 text-right">Orders</th>
                    <th className="py-2 text-right">Value</th>
                    <th className="py-2 text-right">Share</th>
                    <th className="py-2 text-right">Cumul.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
                  {aggregated.map((item, idx) => (
                    <tr key={item.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2 font-sans font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                        />
                        <span className="truncate max-w-[200px]">{item.key}</span>
                      </td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-400">{item.units}</td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-400">{item.ordersCount}</td>
                      <td className="py-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatValue(item.value)}
                      </td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                        {item.sharePct.toFixed(1)}%
                      </td>
                      <td className="py-2 text-right text-blue-600 dark:text-blue-400">
                        {item.cumulativePct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
