import React, { useState, useMemo } from 'react';
import {
  SaleRecord,
  computeOrderSummaries,
  exportRecordsToCsv,
  createSaleRecord,
  parseSalesCsv,
} from '../utils/salesAnalytics';
import {
  Download,
  Plus,
  Upload,
  RotateCcw,
  ArrowUpDown,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface LedgerAndDataViewProps {
  records: SaleRecord[];
  totalDatasetCount: number;
  onAddRecord: (record: SaleRecord) => void;
  onReplaceDataset: (records: SaleRecord[]) => void;
  onResetToOriginal: () => void;
}

type SortField = 'orderNumber' | 'date' | 'product' | 'category' | 'price' | 'paymentMethod';

export const LedgerAndDataView: React.FC<LedgerAndDataViewProps> = ({
  records,
  totalDatasetCount,
  onAddRecord,
  onReplaceDataset,
  onResetToOriginal,
}) => {
  const [ledgerMode, setLedgerMode] = useState<'items' | 'orders'>('items');
  const [sortField, setSortField] = useState<SortField>('orderNumber');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showImportPanel, setShowImportPanel] = useState<boolean>(false);

  // Add Sale Form State
  const [newOrderNum, setNewOrderNum] = useState<string>('TT-1099');
  const [newProduct, setNewProduct] = useState<string>('Slim-Fit Denim Jeans');
  const [newPrice, setNewPrice] = useState<string>('88.00');
  const [newDate, setNewDate] = useState<string>('2025-10-08');
  const [newPayment, setNewPayment] = useState<string>('Credit Card');
  const [formError, setFormError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // CSV Import State
  const [csvInputText, setCsvInputText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedRecords = useMemo(() => {
    const copy = [...records];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'price') {
        cmp = a.price - b.price;
      } else {
        cmp = String(a[sortField]).localeCompare(String(b[sortField]));
      }
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [records, sortField, sortAsc]);

  const groupedOrders = useMemo(() => computeOrderSummaries(records), [records]);

  const handleDownloadCsv = () => {
    const csvContent = exportRecordsToCsv(sortedRecords);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sales_ledger_export_${sortedRecords.length}_rows.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedOrder = newOrderNum.trim();
    const trimmedProduct = newProduct.trim();
    const numericPrice = Number.parseFloat(newPrice);

    if (!trimmedOrder) {
      setFormError('Order Number is required (e.g., TT-1099).');
      return;
    }
    if (!trimmedProduct) {
      setFormError('Product name is required.');
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setFormError('Price must be a valid positive number.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate.trim())) {
      setFormError('Date must be in YYYY-MM-DD format.');
      return;
    }

    const record = createSaleRecord(
      {
        orderNumber: trimmedOrder,
        product: trimmedProduct,
        price: Math.round(numericPrice * 100) / 100,
        date: newDate.trim(),
        paymentMethod: newPayment,
      },
      totalDatasetCount + 1
    );
    onAddRecord(record);
    setStatusBanner(`Added transaction ${record.orderNumber} (${record.product} · $${record.price.toFixed(2)})`);
    setShowAddForm(false);
  };

  const handleImportCsvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    const { records: parsed, errors } = parseSalesCsv(csvInputText);
    if (parsed.length === 0) {
      setImportError(errors[0] || 'No valid rows found in CSV text.');
      return;
    }
    onReplaceDataset(parsed);
    setStatusBanner(`Loaded ${parsed.length} rows from custom CSV input.`);
    setShowImportPanel(false);
    setCsvInputText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = String(evt.target?.result || '');
      const { records: parsed, errors } = parseSalesCsv(content);
      if (parsed.length === 0) {
        setImportError(errors[0] || 'Could not parse uploaded CSV file.');
      } else {
        onReplaceDataset(parsed);
        setStatusBanner(`Imported ${parsed.length} rows from ${file.name}.`);
        setShowImportPanel(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Status feedback banner */}
      {statusBanner && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action & Mode Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Transaction Ledger & CSV Data Manager</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Source file: <code className="font-mono text-slate-700 dark:text-slate-300">Sales_data_-_Sheet1_5e94d700.csv</code> ({records.length} matching of {totalDatasetCount} total line items)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md">
              <button
                type="button"
                onClick={() => setLedgerMode('items')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  ledgerMode === 'items'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Line Items ({records.length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerMode('orders')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  ledgerMode === 'orders'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Grouped by Order ({groupedOrders.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowImportPanel(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Sale Entry</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowImportPanel(!showImportPanel);
                setShowAddForm(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>

            {totalDatasetCount !== 116 && (
              <button
                type="button"
                onClick={() => {
                  onResetToOriginal();
                  setStatusBanner('Restored original 116-row dataset from Sales_data_-_Sheet1_5e94d700.csv.');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Original CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Add Record Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateRecord}
            className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Append New Transaction Row
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label htmlFor="add-order-num" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Order Number
                </label>
                <input
                  id="add-order-num"
                  type="text"
                  value={newOrderNum}
                  onChange={(e) => setNewOrderNum(e.target.value)}
                  placeholder="TT-1099"
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="add-product" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Product
                </label>
                <input
                  id="add-product"
                  type="text"
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="add-price" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Price ($)
                </label>
                <input
                  id="add-price"
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="add-date" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Date (YYYY-MM-DD)
                </label>
                <input
                  id="add-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="add-payment" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Payment Method
                </label>
                <select
                  id="add-payment"
                  value={newPayment}
                  onChange={(e) => setNewPayment(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="eWallet">eWallet</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Transaction Row
              </button>
            </div>
          </form>
        )}

        {/* Collapsible CSV Import Panel */}
        {showImportPanel && (
          <form
            onSubmit={handleImportCsvSubmit}
            className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Upload or Paste Custom CSV Data (Order Number, Product, Price, Date, Payment Method)
              </h3>
              <label className="cursor-pointer text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                <span>Choose .CSV File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>

            {importError && (
              <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">
                {importError}
              </div>
            )}

            <textarea
              rows={4}
              value={csvInputText}
              onChange={(e) => setCsvInputText(e.target.value)}
              placeholder="Order Number,Product,Price,Date,Payment Method&#10;TT-2001,Slim-Fit Denim Jeans,$88.00,2025-10-10,Credit Card"
              className="w-full p-3 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportPanel(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-md"
              >
                Parse & Load CSV
              </button>
            </div>
          </form>
        )}
      </div>

      {/* High-Density Data Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {ledgerMode === 'items' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('orderNumber')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      <span>Order Number</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('date')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('product')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      <span>Product Description</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('category')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      <span>Department</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('paymentMethod')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      <span>Payment Method</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('price')}
                      className="inline-flex items-center gap-1 ml-auto hover:text-slate-900 dark:hover:text-white"
                    >
                      <span>Price</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedRecords.map((r) => (
                  <tr key={r.id} className="h-10 hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {r.orderNumber}
                    </td>
                    <td className="px-4 font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {r.date} · {r.dayOfWeekName.slice(0, 3)}
                    </td>
                    <td className="px-4 font-medium text-slate-900 dark:text-slate-100">
                      {r.product}
                    </td>
                    <td className="px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {r.category}
                    </td>
                    <td className="px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {r.paymentMethod}
                    </td>
                    <td className="px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      ${r.price.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="py-2.5 px-4">Order Number</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Items in Basket</th>
                  <th className="py-2.5 px-4">Line Items Purchased</th>
                  <th className="py-2.5 px-4">Tenders Used</th>
                  <th className="py-2.5 px-4 text-right">Order Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {groupedOrders.map((o) => (
                  <tr key={o.orderNumber} className="h-10 hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {o.orderNumber}
                    </td>
                    <td className="px-4 font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {o.date}
                    </td>
                    <td className="px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {o.itemCount}
                    </td>
                    <td className="px-4 text-slate-800 dark:text-slate-200">
                      {o.items.map((i) => i.product).join(' + ')}
                    </td>
                    <td className="px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {o.paymentMethods.join(' · ')}
                    </td>
                    <td className="px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      ${o.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
