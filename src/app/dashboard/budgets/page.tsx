"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle, X, Loader2 } from "lucide-react";
import { formatCurrency, CATEGORIES } from "@/lib/utils";

type Budget = {
  id: string;
  category: string;
  limit: number;
  period: string;
  spent: number;
};

function BudgetModal({
  onClose,
  onSaved,
  budget,
}: {
  onClose: () => void;
  onSaved: () => void;
  budget?: Budget | null;
}) {
  const isEdit = !!budget;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    category: budget?.category ?? "",
    limit: budget?.limit?.toString() ?? "",
    period: budget?.period ?? "monthly",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = isEdit ? `/api/budgets/${budget!.id}` : "/api/budgets";
    const method = isEdit ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">
            {isEdit ? "Edit Budget" : "Set Budget"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Category</label>
            {isEdit ? (
              <input
                disabled
                value={form.category}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
              />
            ) : (
              <select
                required
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Monthly Limit (₹)</label>
            <input
              type="number"
              required
              min="1"
              value={form.limit}
              onChange={(e) => setForm((f) => ({ ...f, limit: e.target.value }))}
              placeholder="e.g. 10000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? "Save" : "Set Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/budgets");
    setBudgets(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this budget?")) return;
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    fetch_();
  }

  // AI-style alerts
  const alerts = budgets.filter((b) => b.spent / b.limit >= 0.8);
  const exceeded = budgets.filter((b) => b.spent > b.limit);
  const totalBudgeted = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Budgets</h1>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Set Budget</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Total Budgeted</p>
          <p className="text-lg font-bold text-gray-800 mt-1">{formatCurrency(totalBudgeted)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Total Spent</p>
          <p className={`text-lg font-bold mt-1 ${totalSpent > totalBudgeted ? "text-red-500" : "text-gray-800"}`}>
            {formatCurrency(totalSpent)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500">Remaining</p>
          <p className={`text-lg font-bold mt-1 ${totalBudgeted - totalSpent >= 0 ? "text-green-600" : "text-red-500"}`}>
            {formatCurrency(totalBudgeted - totalSpent)}
          </p>
        </div>
      </div>

      {/* AI Alerts */}
      {exceeded.length > 0 && (
        <div className="mb-4 space-y-2">
          {exceeded.map((b) => (
            <div key={b.id} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">
                  Budget exceeded — {b.category}
                </p>
                <p className="text-xs text-red-500 mt-0.5">
                  You&apos;ve spent {formatCurrency(b.spent)} against a {formatCurrency(b.limit)} budget.
                  Consider reducing {b.category.toLowerCase()} expenses.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {alerts.filter((b) => b.spent <= b.limit).length > 0 && (
        <div className="mb-4 space-y-2">
          {alerts
            .filter((b) => b.spent <= b.limit)
            .map((b) => {
              const pct = Math.round((b.spent / b.limit) * 100);
              return (
                <div key={b.id} className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-700">
                      Approaching limit — {b.category} ({pct}% used)
                    </p>
                    <p className="text-xs text-yellow-600 mt-0.5">
                      {formatCurrency(b.limit - b.spent)} remaining this month.
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Budget Cards */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <PieChartIcon />
          <p className="text-gray-500 mt-3 text-sm">No budgets set yet.</p>
          <p className="text-gray-400 text-xs mt-1">Set a budget to track your spending limits.</p>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Set your first budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const pct = Math.min((b.spent / b.limit) * 100, 100);
            const over = b.spent > b.limit;
            const warn = pct >= 80 && !over;
            return (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">{b.category}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{b.period}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {over ? (
                      <AlertTriangle size={15} className="text-red-500" />
                    ) : warn ? (
                      <AlertTriangle size={15} className="text-yellow-500" />
                    ) : (
                      <CheckCircle size={15} className="text-green-500" />
                    )}
                    <button
                      onClick={() => { setEditing(b); setShowModal(true); }}
                      className="text-gray-400 hover:text-blue-500 ml-1"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 bg-gray-100 rounded-full mb-3">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      over ? "bg-red-500" : warn ? "bg-yellow-400" : "bg-blue-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs">
                  <span className={over ? "text-red-500 font-medium" : "text-gray-500"}>
                    Spent: {formatCurrency(b.spent)}
                  </span>
                  <span className="text-gray-400">
                    Limit: {formatCurrency(b.limit)}
                  </span>
                </div>

                <div className={`mt-2 text-xs font-medium ${
                  over ? "text-red-500" : "text-gray-400"
                }`}>
                  {over
                    ? `Over by ${formatCurrency(b.spent - b.limit)}`
                    : `${formatCurrency(b.limit - b.spent)} left`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <BudgetModal
          budget={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetch_(); }}
        />
      )}
    </div>
  );
}

function PieChartIcon() {
  return (
    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    </div>
  );
}
