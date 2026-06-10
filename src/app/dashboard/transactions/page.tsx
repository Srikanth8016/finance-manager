"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, Filter } from "lucide-react";
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMonth, setFilterMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterMonth) params.set("month", filterMonth);
    if (filterCategory) params.set("category", filterCategory);
    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data);
    setLoading(false);
  }, [filterMonth, filterCategory]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    fetchTransactions();
  }

  function handleEdit(t: Transaction) {
    setEditing(t);
    setShowModal(true);
  }

  const filtered = transactions.filter(
    (t) =>
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalIncome = filtered
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Transactions</h1>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </button>
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
            placeholder="Search..."
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
            <option value="">All</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
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
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(t.date)}</td>
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
                  <td className={`px-4 py-3 text-sm font-semibold text-right ${
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

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
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

      {showModal && (
        <TransactionModal
          transaction={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchTransactions(); }}
        />
      )}
    </div>
  );
}
