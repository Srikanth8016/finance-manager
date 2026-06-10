"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Investment = {
  id: string;
  name: string;
  type: string;
  investedAmount: number;
  currentValue: number;
  units?: number | null;
  buyPrice?: number | null;
  notes?: string | null;
};

const TYPES = ["stocks", "mutual_funds", "fd", "gold", "crypto", "other"];
const TYPE_LABELS: Record<string, string> = {
  stocks: "Stocks", mutual_funds: "Mutual Funds", fd: "Fixed Deposit",
  gold: "Gold", crypto: "Crypto", other: "Other",
};
const TYPE_COLORS: Record<string, string> = {
  stocks: "bg-blue-100 text-blue-700", mutual_funds: "bg-purple-100 text-purple-700",
  fd: "bg-green-100 text-green-700", gold: "bg-yellow-100 text-yellow-700",
  crypto: "bg-orange-100 text-orange-700", other: "bg-gray-100 text-gray-600",
};

function InvestmentModal({ inv, onClose, onSaved }: {
  inv?: Investment | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!inv;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: inv?.name ?? "", type: inv?.type ?? "stocks",
    investedAmount: inv?.investedAmount?.toString() ?? "",
    currentValue: inv?.currentValue?.toString() ?? "",
    units: inv?.units?.toString() ?? "", buyPrice: inv?.buyPrice?.toString() ?? "",
    notes: inv?.notes ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(isEdit ? `/api/investments/${inv!.id}` : "/api/investments", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">{isEdit ? "Edit Investment" : "Add Investment"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Investment Name</label>
            <input required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. HDFC Bank, Nifty 50 Index Fund"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Invested (₹)</label>
              <input type="number" required min="0" value={form.investedAmount}
                onChange={(e) => setForm(f => ({ ...f, investedAmount: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Current Value (₹)</label>
              <input type="number" required min="0" value={form.currentValue}
                onChange={(e) => setForm(f => ({ ...f, currentValue: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Units (optional)</label>
              <input type="number" min="0" step="0.001" value={form.units}
                onChange={(e) => setForm(f => ({ ...f, units: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Buy Price (optional)</label>
              <input type="number" min="0" value={form.buyPrice}
                onChange={(e) => setForm(f => ({ ...f, buyPrice: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
            <input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);

  const fetchInvestments = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/investments");
    setInvestments(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvestments(); }, [fetchInvestments]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this investment?")) return;
    await fetch(`/api/investments/${id}`, { method: "DELETE" });
    fetchInvestments();
  }

  const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
  const totalCurrent = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalGain = totalCurrent - totalInvested;
  const totalReturn = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // Group by type
  const byType: Record<string, number> = {};
  investments.forEach((i) => {
    byType[i.type] = (byType[i.type] || 0) + i.currentValue;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Investments</h1>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} />
          <span className="hidden sm:inline">Add Investment</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Portfolio summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Total Invested</p>
          <p className="text-lg font-bold text-gray-800 mt-1">{formatCurrency(totalInvested)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Current Value</p>
          <p className="text-lg font-bold text-gray-800 mt-1">{formatCurrency(totalCurrent)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Total Gain/Loss</p>
          <p className={`text-lg font-bold mt-1 flex items-center gap-1 ${totalGain >= 0 ? "text-green-600" : "text-red-500"}`}>
            {totalGain >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {formatCurrency(Math.abs(totalGain))}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Total Return</p>
          <p className={`text-lg font-bold mt-1 ${totalReturn >= 0 ? "text-green-600" : "text-red-500"}`}>
            {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Type breakdown */}
      {Object.keys(byType).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Portfolio Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, val]) => (
              <div key={type} className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium w-28 text-center ${TYPE_COLORS[type]}`}>
                  {TYPE_LABELS[type]}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full">
                  <div className="h-2 bg-blue-500 rounded-full"
                    style={{ width: `${totalCurrent > 0 ? (val / totalCurrent) * 100 : 0}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-700 w-24 text-right">{formatCurrency(val)}</span>
                <span className="text-xs text-gray-400 w-10 text-right">
                  {totalCurrent > 0 ? ((val / totalCurrent) * 100).toFixed(0) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Investment list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={28} /></div>
      ) : investments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp size={28} className="text-blue-400" />
          </div>
          <p className="text-gray-600 font-medium">No investments tracked yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your stocks, mutual funds, FDs and more.</p>
          <button onClick={() => { setEditing(null); setShowModal(true); }}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Add your first investment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {investments.map((inv) => {
            const gain = inv.currentValue - inv.investedAmount;
            const ret = inv.investedAmount > 0 ? (gain / inv.investedAmount) * 100 : 0;
            return (
              <div key={inv.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{inv.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${TYPE_COLORS[inv.type]}`}>
                      {TYPE_LABELS[inv.type]}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(inv); setShowModal(true); }}
                      className="text-gray-400 hover:text-blue-500 p-1"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(inv.id)}
                      className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Invested</p>
                    <p className="font-medium text-gray-700">{formatCurrency(inv.investedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Current</p>
                    <p className="font-medium text-gray-700">{formatCurrency(inv.currentValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Gain/Loss</p>
                    <p className={`font-semibold ${gain >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {gain >= 0 ? "+" : ""}{formatCurrency(gain)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Return</p>
                    <p className={`font-semibold ${ret >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {ret >= 0 ? "+" : ""}{ret.toFixed(1)}%
                    </p>
                  </div>
                </div>
                {inv.notes && <p className="text-xs text-gray-400 mt-3 border-t border-gray-50 pt-2">{inv.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <InvestmentModal inv={editing} onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchInvestments(); }} />
      )}
    </div>
  );
}
