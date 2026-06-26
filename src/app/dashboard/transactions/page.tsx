"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Pencil, Trash2, Search, Filter,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2,
  Download,
} from "lucide-react";
import { formatCurrency, formatDate, CATEGORIES } from "@/lib/utils";
import TransactionModal from "@/components/TransactionModal";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  note?: string | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

const LIMIT = 20;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [exporting, setExporting] = useState<"csv" | "excel" | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  // page — resets to 1 when filters change
  const [page, setPage] = useState(1);

  // ── fetch ──────────────────────────────────────────────────────
  const fetchTransactions = useCallback(async (p: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page",  String(p));
    params.set("limit", String(LIMIT));
    if (filterMonth)    params.set("month",    filterMonth);
    if (filterCategory) params.set("category", filterCategory);

    const res  = await fetch(`/api/transactions?${params}`);
    const json = await res.json();

    setTransactions(json.data ?? []);
    setPagination(json.pagination ?? null);
    setLoading(false);
  }, [filterMonth, filterCategory]);

  // reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filterMonth, filterCategory]);

  useEffect(() => {
    fetchTransactions(page);
  }, [fetchTransactions, page]);

  // ── actions ────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    fetchTransactions(page);
  }

  function handleEdit(t: Transaction) {
    setEditing(t);
    setShowModal(true);
  }

  // ── export ────────────────────────────────────────────────────
  async function handleExport(fmt: "csv" | "excel") {
    setExporting(fmt);
    const params = new URLSearchParams();
    if (filterMonth)    params.set("month",    filterMonth);
    if (filterCategory) params.set("category", filterCategory);

    const endpoint = fmt === "csv" ? "/api/export/csv" : "/api/export/excel";
    const res = await fetch(`${endpoint}?${params}`);
    if (!res.ok) { setExporting(null); return; }

    const blob     = await res.blob();
    const url      = URL.createObjectURL(blob);
    const filename = res.headers.get("Content-Disposition")
      ?.match(/filename="(.+)"/)?.[1]
      ?? (fmt === "csv" ? "transactions.csv" : "transactions.xlsx");

    const a = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  }

  // client-side search filter (within current page)
  const filtered = transactions.filter(
    (t) =>
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  // summary across visible rows
  const totalIncome  = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // ── pagination helpers ─────────────────────────────────────────
  function goTo(p: number) {
    if (!pagination) return;
    const clamped = Math.max(1, Math.min(p, pagination.totalPages));
    setPage(clamped);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function pageWindow(): number[] {
    if (!pagination) return [];
    const { totalPages } = pagination;
    const delta = 2;
    const range: number[] = [];
    const left  = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);
    for (let i = left; i <= right; i++) range.push(i);
    return range;
  }

  // ── render ─────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Transactions</h1>
          {pagination && (
            <p className="text-xs text-gray-400 mt-0.5">
              {pagination.total.toLocaleString()} total · page {pagination.page} of {pagination.totalPages}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={() => handleExport("csv")}
            disabled={exporting !== null}
            className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-600 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {exporting === "csv"
              ? <Loader2 size={15} className="animate-spin" />
              : <Download size={15} />}
            <span className="hidden sm:inline">{exporting === "csv" ? "Exporting…" : "CSV"}</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={() => handleExport("excel")}
            disabled={exporting !== null}
            className="flex items-center gap-2 border border-green-300 hover:bg-green-50 text-green-700 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {exporting === "excel"
              ? <Loader2 size={15} className="animate-spin" />
              : <Download size={15} />}
            <span className="hidden sm:inline">{exporting === "excel" ? "Exporting…" : "Excel"}</span>
          </button>

          {/* Add transaction */}
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl p-3 lg:p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Income</p>
          <p className="text-base lg:text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 lg:p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Expenses</p>
          <p className="text-base lg:text-xl font-bold text-red-500">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 lg:p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Net</p>
          <p className={`text-base lg:text-xl font-bold ${totalIncome - totalExpense >= 0 ? "text-blue-600" : "text-red-500"}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search this page..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <Filter size={14} className="text-gray-400 shrink-0" />
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* ── Desktop Table ─────────────────────────────────────── */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 gap-3 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No transactions found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{t.description}</p>
                    {t.note && <p className="text-xs text-gray-400">{t.note}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      t.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}>{t.type}</span>
                  </td>
                  <td className={`px-4 py-3 text-sm font-semibold text-right whitespace-nowrap ${
                    t.type === "income" ? "text-green-600" : "text-red-500"
                  }`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-blue-500">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Mobile Cards ──────────────────────────────────────── */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No transactions found.</div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    t.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                  }`}>
                    {t.type === "income" ? "+" : "-"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.description}</p>
                    <p className="text-xs text-gray-400">{t.category} · {formatDate(t.date)}</p>
                    {t.note && <p className="text-xs text-gray-400 mt-0.5">{t.note}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-sm font-bold ${
                    t.type === "income" ? "text-green-600" : "text-red-500"
                  }`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                  <div className="flex gap-3">
                    <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-blue-500">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Pagination Controls ───────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Row count info */}
          <p className="text-xs text-gray-400 order-2 sm:order-1">
            Showing{" "}
            <span className="font-medium text-gray-600">
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-600">
              {pagination.total.toLocaleString()}
            </span>{" "}
            transactions
          </p>

          {/* Page buttons */}
          <div className="flex items-center gap-1 order-1 sm:order-2">
            {/* First */}
            <button
              onClick={() => goTo(1)}
              disabled={!pagination.hasPrev}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="First page"
            >
              <ChevronsLeft size={16} />
            </button>

            {/* Prev */}
            <button
              onClick={() => goTo(page - 1)}
              disabled={!pagination.hasPrev}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Leading ellipsis */}
            {pageWindow()[0] > 1 && (
              <>
                <PageBtn n={1} current={page} onClick={goTo} />
                {pageWindow()[0] > 2 && (
                  <span className="px-1 text-gray-300 text-sm select-none">…</span>
                )}
              </>
            )}

            {/* Window */}
            {pageWindow().map((n) => (
              <PageBtn key={n} n={n} current={page} onClick={goTo} />
            ))}

            {/* Trailing ellipsis */}
            {pageWindow()[pageWindow().length - 1] < pagination.totalPages && (
              <>
                {pageWindow()[pageWindow().length - 1] < pagination.totalPages - 1 && (
                  <span className="px-1 text-gray-300 text-sm select-none">…</span>
                )}
                <PageBtn n={pagination.totalPages} current={page} onClick={goTo} />
              </>
            )}

            {/* Next */}
            <button
              onClick={() => goTo(page + 1)}
              disabled={!pagination.hasNext}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>

            {/* Last */}
            <button
              onClick={() => goTo(pagination.totalPages)}
              disabled={!pagination.hasNext}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Last page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>

          {/* Jump to page */}
          <div className="flex items-center gap-2 text-xs text-gray-400 order-3">
            <span>Go to</span>
            <input
              type="number"
              min={1}
              max={pagination.totalPages}
              defaultValue={page}
              key={page} // re-mount on page change to reset value
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  goTo(parseInt((e.target as HTMLInputElement).value, 10));
                }
              }}
              className="w-14 px-2 py-1 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {showModal && (
        <TransactionModal
          transaction={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchTransactions(page); }}
        />
      )}
    </div>
  );
}

// ── small reusable page button ──────────────────────────────────
function PageBtn({ n, current, onClick }: { n: number; current: number; onClick: (n: number) => void }) {
  const active = n === current;
  return (
    <button
      onClick={() => onClick(n)}
      className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {n}
    </button>
  );
}
