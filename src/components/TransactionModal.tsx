"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { CATEGORIES } from "@/lib/utils";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  date: string | Date;
  note?: string | null;
};

type Props = {
  onClose: () => void;
  onSaved: () => void;
  transaction?: Transaction | null;
};

export default function TransactionModal({ onClose, onSaved, transaction }: Props) {
  const isEdit = !!transaction;
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    type: transaction?.type ?? "expense",
    amount: transaction?.amount?.toString() ?? "",
    description: transaction?.description ?? "",
    category: transaction?.category ?? "auto",
    date: transaction?.date
      ? new Date(transaction.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    note: transaction?.note ?? "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (form.category === "auto") setAiLoading(true);

    const url = isEdit ? `/api/transactions/${transaction.id}` : "/api/transactions";
    const method = isEdit ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    setAiLoading(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 text-lg">
            {isEdit ? "Edit Transaction" : "Add Transaction"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {["expense", "income"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("type", t)}
                className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${
                  form.type === t
                    ? t === "expense"
                      ? "bg-red-500 text-white"
                      : "bg-green-500 text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Amount (₹)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Description</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. Uber ride, Salary, Zomato"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Category
              {aiLoading && (
                <span className="ml-2 text-blue-500 text-xs inline-flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> AI categorizing...
                </span>
              )}
            </label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">✨ Auto-detect (AI)</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Note (optional)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Any additional note"
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
              {isEdit ? "Save Changes" : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
