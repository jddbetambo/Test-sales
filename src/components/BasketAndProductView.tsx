import React, { useState } from 'react';
import {
  SaleRecord,
  ProductPerformance,
  OrderSummary,
  BasketPair,
  computeOrderSummaries,
  computeBasketPairs,
} from '../utils/salesAnalytics';
import { ShoppingBag, GitMerge, Split, PackageCheck } from 'lucide-react';

interface BasketAndProductViewProps {
  records: SaleRecord[];
  products: ProductPerformance[];
  onToggleProduct: (product: string) => void;
}

const PAYMENT_COLORS: Record<string, string> = {
  'Credit Card': '#0f172a',
  'eWallet': '#2563eb',
  'Debit Card': '#0d9488',
  'Cash': '#d97706',
};

export const BasketAndProductView: React.FC<BasketAndProductViewProps> = ({
  records,
  products,
  onToggleProduct,
}) => {
  const [basketFilter, setBasketFilter] = useState<'all_multi' | 'split_tender'>('all_multi');

  const orders: OrderSummary[] = computeOrderSummaries(records);
  const multiItemOrders = orders.filter((o) => o.itemCount > 1);
  const splitTenderOrders = multiItemOrders.filter((o) => o.hasSplitPayment);
  const singleItemOrders = orders.filter((o) => o.itemCount === 1);
  const pairs: BasketPair[] = computeBasketPairs(records);

  const displayedMultiOrders =
    basketFilter === 'split_tender' ? splitTenderOrders : multiItemOrders;

  const singleAvg =
    singleItemOrders.length > 0
      ? singleItemOrders.reduce((s, o) => s + o.totalAmount, 0) / singleItemOrders.length
      : 0;
  const multiAvg =
    multiItemOrders.length > 0
      ? multiItemOrders.reduce((s, o) => s + o.totalAmount, 0) / multiItemOrders.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Cohort Summary Strip */}
      <section aria-label="Order Basket Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Single-Item Orders</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {singleItemOrders.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono tabular-nums">
            <span>Avg Basket: ${singleAvg.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Multi-Item Baskets (2+ SKUs)</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {multiItemOrders.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono tabular-nums">
            <span>Avg Basket: ${multiAvg.toFixed(2)}</span>
            <span aria-hidden="true">·</span>
            <span>+{singleAvg > 0 ? (((multiAvg - singleAvg) / singleAvg) * 100).toFixed(0) : 0}% lift</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Split-Tender Orders</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {splitTenderOrders.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Orders paid with 2 distinct payment tenders
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Distinct Co-Purchased Pairs</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {pairs.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Unique product combinations in single orders
          </div>
        </div>
      </section>

      {/* Co-Occurrence Pairs & Multi-Item Order Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Product Pair Affinity Table */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Product Co-Purchase Affinity</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Apparel items purchased together within the same order number
              </p>
            </div>
          </div>

          {pairs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No multi-item orders found in the current filter selection.
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                    <th className="py-2 pr-2">Paired Apparel SKUs</th>
                    <th className="py-2 px-2 text-right">Co-Purchases</th>
                    <th className="py-2 px-2 text-right">Combined Basket</th>
                    <th className="py-2 pl-2 text-right">Order IDs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pairs.map((pair) => (
                    <tr key={pair.pairKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 pr-2">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {pair.productA}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          + {pair.productB}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {pair.coOccurrences}×
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        ${pair.combinedOrderRevenue.toFixed(2)}
                      </td>
                      <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-slate-500">
                        {pair.orderNumbers.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Multi-Item Order Breakdown & Split Tender Inspector */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Split className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Multi-Item Order & Tender Breakdown</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inspect orders containing multiple line items or split payment methods
              </p>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md">
              <button
                type="button"
                onClick={() => setBasketFilter('all_multi')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  basketFilter === 'all_multi'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All Multi-Item ({multiItemOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setBasketFilter('split_tender')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  basketFilter === 'split_tender'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Split Tender ({splitTenderOrders.length})
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
            {displayedMultiOrders.map((ord) => (
              <div key={ord.orderNumber} className="py-3 first:pt-1 last:pb-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                      {ord.orderNumber}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono tabular-nums text-slate-500">{ord.date}</span>
                    {ord.hasSplitPayment && (
                      <>
                        <span className="text-slate-400">·</span>
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          Split Payment ({ord.paymentMethods.join(' + ')})
                        </span>
                      </>
                    )}
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    ${ord.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1.5 space-y-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                  {ord.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400"
                    >
                      <span>{item.product}</span>
                      <span className="font-mono tabular-nums">
                        ${item.price.toFixed(2)} · {item.paymentMethod}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full 12-Product Merchandising Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Complete SKU Catalog & Tender Preference Matrix</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Unit economics, order penetration, and payment method breakdown across all 12 apparel lines
            </p>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <th className="py-2.5 pr-3">Product Name</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Units Sold</th>
                <th className="py-2.5 px-3 text-right">Total Revenue</th>
                <th className="py-2.5 px-3 text-right">Rev Share</th>
                <th className="py-2.5 px-3 text-right">Order Penetration</th>
                <th className="py-2.5 pl-3 w-48">Tender Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((p) => {
                const methods = ['Credit Card', 'eWallet', 'Debit Card', 'Cash'];
                return (
                  <tr
                    key={p.product}
                    onClick={() => onToggleProduct(p.product)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                  >
                    <td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {p.product}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {p.category}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      ${p.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {p.unitsSold}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      ${p.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {p.revenueSharePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {p.orderSharePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 pl-3">
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs overflow-hidden flex">
                        {methods.map((m) => {
                          const stat = p.paymentBreakdown[m];
                          if (!stat || stat.units === 0) return null;
                          const pct = (stat.units / p.unitsSold) * 100;
                          return (
                            <div
                              key={m}
                              style={{
                                width: `${pct}%`,
                                backgroundColor: PAYMENT_COLORS[m] || '#64748b',
                              }}
                              title={`${m}: ${stat.units} units ($${stat.revenue})`}
                              className="h-full"
                            />
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
