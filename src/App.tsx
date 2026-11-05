import React, { useState, useMemo, useEffect } from 'react';
import {
  INITIAL_SALES_CSV_RAW,
  INITIAL_SALES_CSV_PATH,
} from './data/initialSalesCsv';
import {
  parseSalesCsv,
  getDefaultFilterState,
  filterRecords,
  computeKpiSummary,
  computeProductPerformance,
  computePaymentBreakdown,
  computeDayOfWeekMetrics,
  exportRecordsToCsv,
  SaleRecord,
  FilterState,
  ProductCategory,
} from './utils/salesAnalytics';
import { OverviewView } from './components/OverviewView';
import { VisualExplorerView } from './components/VisualExplorerView';
import { BasketAndProductView } from './components/BasketAndProductView';
import { LedgerAndDataView } from './components/LedgerAndDataView';
import {
  Search,
  RotateCcw,
  Download,
  FilterX,
  Calendar,
} from 'lucide-react';

type ActiveWorkspaceTab = 'overview' | 'explorer' | 'baskets' | 'ledger';

const ALL_CATEGORIES: ProductCategory[] = [
  'Tailored & Dress',
  'Denim & Workwear',
  'Casual & Chinos',
  'Active & Shorts',
];

const ALL_PAYMENTS = ['Credit Card', 'eWallet', 'Debit Card', 'Cash'];

export default function App() {
  const initialParsed = useMemo(() => parseSalesCsv(INITIAL_SALES_CSV_RAW).records, []);
  const [allRecords, setAllRecords] = useState<SaleRecord[]>(initialParsed);
  const [filters, setFilters] = useState<FilterState>(getDefaultFilterState);
  const [activeTab, setActiveTab] = useState<ActiveWorkspaceTab>('overview');

  // Also synchronize with the static asset file on mount if reachable
  useEffect(() => {
    fetch(INITIAL_SALES_CSV_PATH)
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (text) {
          const parsed = parseSalesCsv(text);
          if (parsed.records.length > 0) {
            setAllRecords((prev) => (prev.length === 116 ? parsed.records : prev));
          }
        }
      })
      .catch(() => {
        // Fallback already seeded from INITIAL_SALES_CSV_RAW
      });
  }, []);

  const filteredRecords = useMemo(
    () => filterRecords(allRecords, filters),
    [allRecords, filters]
  );

  const kpi = useMemo(() => computeKpiSummary(filteredRecords), [filteredRecords]);
  const products = useMemo(() => computeProductPerformance(filteredRecords), [filteredRecords]);
  const payments = useMemo(() => computePaymentBreakdown(filteredRecords), [filteredRecords]);
  const dayMetrics = useMemo(() => computeDayOfWeekMetrics(filteredRecords), [filteredRecords]);

  const hasActiveFilters =
    filters.searchQuery.trim() !== '' ||
    filters.products.length > 0 ||
    filters.categories.length > 0 ||
    filters.paymentMethods.length > 0 ||
    filters.priceTiers.length > 0 ||
    filters.dateStart !== '' ||
    filters.dateEnd !== '' ||
    filters.onlyMultiItemOrders;

  const toggleProductFilter = (product: string) => {
    setFilters((prev) => ({
      ...prev,
      products: prev.products.includes(product)
        ? prev.products.filter((p) => p !== product)
        : [...prev.products, product],
    }));
  };

  const togglePaymentFilter = (method: string) => {
    setFilters((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter((m) => m !== method)
        : [...prev.paymentMethods, method],
    }));
  };

  const toggleCategoryFilter = (cat: ProductCategory) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const resetAllFilters = () => {
    setFilters(getDefaultFilterState());
  };

  const handleQuickExportCsv = () => {
    const csv = exportRecordsToCsv(filteredRecords);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atelier_sales_filtered_${filteredRecords.length}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-display whitespace-nowrap shrink-0"
          >
            Atelier Ledger
          </a>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav aria-label="Primary Workspace Views" className="flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'overview'
                  ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('explorer')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'explorer'
                  ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Visual Studio
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('baskets')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'baskets'
                  ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Baskets & SKUs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'ledger'
                  ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Transaction Ledger
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleQuickExportCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Context Header & Global Cross-Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-[1400px] mx-auto space-y-3">
          {/* Context Title & Dataset Metadata */}
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Apparel & Menswear Retail Sales Intelligence
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Dataset: Sales_data_-_Sheet1.csv</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">Aug 15, 2025 – Oct 07, 2025</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Showing {filteredRecords.length} of {allRecords.length} line items ({kpi.uniqueOrderCount} orders)
                </span>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>

          {/* Interactive Filter Controls Row */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Search orders, products, or payment methods"
                value={filters.searchQuery}
                onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
                placeholder="Search order TT-1001, product, tender..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <label htmlFor="filter-date-start" className="sr-only">
                Start Date
              </label>
              <input
                id="filter-date-start"
                type="date"
                aria-label="Start Date"
                value={filters.dateStart}
                min="2025-08-15"
                max="2025-10-07"
                onChange={(e) => setFilters((prev) => ({ ...prev, dateStart: e.target.value }))}
                className="px-2 py-1 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
              />
              <span>to</span>
              <label htmlFor="filter-date-end" className="sr-only">
                End Date
              </label>
              <input
                id="filter-date-end"
                type="date"
                aria-label="End Date"
                value={filters.dateEnd}
                min="2025-08-15"
                max="2025-10-07"
                onChange={(e) => setFilters((prev) => ({ ...prev, dateEnd: e.target.value }))}
                className="px-2 py-1 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Payment Method Interactive Filter Buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg" role="group" aria-label="Filter by Payment Method">
              {ALL_PAYMENTS.map((pm) => {
                const active = filters.paymentMethods.includes(pm);
                return (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => togglePaymentFilter(pm)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {pm}
                  </button>
                );
              })}
            </div>

            {/* Multi-item Basket Filter Button */}
            <button
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  onlyMultiItemOrders: !prev.onlyMultiItemOrders,
                }))
              }
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                filters.onlyMultiItemOrders
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              Multi-Item Baskets Only
            </button>
          </div>

          {/* Active Product / Category Filter Readout */}
          {(filters.products.length > 0 || filters.categories.length > 0) && (
            <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">Active Drill-Down:</span>
              {filters.categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategoryFilter(cat)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-200"
                >
                  <span>{cat}</span>
                  <span aria-hidden="true">×</span>
                </button>
              ))}
              {filters.products.map((prod) => (
                <button
                  key={prod}
                  type="button"
                  onClick={() => toggleProductFilter(prod)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-200"
                >
                  <span>{prod}</span>
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-6">
        {filteredRecords.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center max-w-lg mx-auto my-8">
            <FilterX className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              No sales records match your active filters
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try broadening your date range, clearing your search query, or resetting product and payment method filters.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-4 px-4 py-2 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewView
                records={filteredRecords}
                kpi={kpi}
                products={products}
                payments={payments}
                dayMetrics={dayMetrics}
                selectedProducts={filters.products}
                selectedPayments={filters.paymentMethods}
                selectedCategories={filters.categories}
                onToggleProduct={toggleProductFilter}
                onTogglePayment={togglePaymentFilter}
                onToggleCategory={toggleCategoryFilter}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'explorer' && (
              <VisualExplorerView
                records={filteredRecords}
                products={products}
                onToggleProduct={toggleProductFilter}
                onTogglePayment={togglePaymentFilter}
              />
            )}

            {activeTab === 'baskets' && (
              <BasketAndProductView
                records={filteredRecords}
                products={products}
                onToggleProduct={toggleProductFilter}
              />
            )}

            {activeTab === 'ledger' && (
              <LedgerAndDataView
                records={filteredRecords}
                totalDatasetCount={allRecords.length}
                onAddRecord={(rec) => setAllRecords((prev) => [rec, ...prev])}
                onReplaceDataset={(newRecs) => {
                  setAllRecords(newRecs);
                  resetAllFilters();
                }}
                onResetToOriginal={() => {
                  setAllRecords(initialParsed);
                  resetAllFilters();
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 mt-8">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Atelier Ledger — Retail Apparel Sales Analytics · Source: Sales_data_-_Sheet1.csv (116 Line Items · 98 Orders · $11,214.00 Total)
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('explorer')}
              className="hover:text-slate-900 dark:hover:text-slate-200 underline-offset-2 hover:underline"
            >
              Launch Visual Studio
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className="hover:text-slate-900 dark:hover:text-slate-200 underline-offset-2 hover:underline"
            >
              Browse Full Ledger
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
