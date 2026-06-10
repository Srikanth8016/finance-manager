"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus, Brain } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Trend = {
  category: string;
  history: { month: string; amount: number }[];
  predicted: number;
};

type PredictData = {
  trends: Trend[];
  totalPredicted: number;
  nextMonth: string;
};

export default function PredictPage() {
  const [data, setData] = useState<PredictData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/predict")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  if (!data || data.trends.length === 0) return (
    <div className="text-center py-16">
      <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <Brain size={28} className="text-blue-400" />
      </div>
      <p className="text-gray-600 font-medium">Not enough data yet</p>
      <p className="text-gray-400 text-sm mt-1">Add at least a few transactions to see predictions.</p>
    </div>
  );

  // Chart data — show top 6 categories
  const chartData = data.trends.slice(0, 6).map((t) => {
    const lastMonth = t.history[t.history.length - 1]?.amount || 0;
    return { category: t.category.split(" ")[0], lastMonth, predicted: t.predicted };
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 lg:mb-6">
        <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center">
          <Brain size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Expense Prediction</h1>
          <p className="text-xs text-gray-400">AI forecast for {data.nextMonth}</p>
        </div>
      </div>

      {/* Total prediction card */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 mb-6 text-white">
        <p className="text-sm text-white/70">Predicted total expenses for {data.nextMonth}</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(data.totalPredicted)}</p>
        <p className="text-xs text-white/60 mt-2">
          Based on weighted average of last 4 months. Recent months weighted higher.
        </p>
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Last Month vs Predicted</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="category" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="lastMonth" name="Last Month" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="predicted" name="Predicted" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category predictions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Category Predictions</h2>
        <div className="space-y-4">
          {data.trends.map((t) => {
            const last = t.history[t.history.length - 1]?.amount || 0;
            const prev = t.history[t.history.length - 2]?.amount || 0;
            const trend = prev > 0 ? ((t.predicted - prev) / prev) * 100 : null;

            return (
              <div key={t.category}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{t.category}</span>
                  <div className="flex items-center gap-3">
                    {trend !== null && (
                      <span className={`text-xs flex items-center gap-0.5 ${
                        trend > 5 ? "text-red-500" : trend < -5 ? "text-green-500" : "text-gray-400"
                      }`}>
                        {trend > 5 ? <TrendingUp size={12} /> : trend < -5 ? <TrendingDown size={12} /> : <Minus size={12} />}
                        {Math.abs(trend).toFixed(0)}%
                      </span>
                    )}
                    <span className="text-sm font-bold text-purple-600">{formatCurrency(t.predicted)}</span>
                  </div>
                </div>

                {/* Mini sparkline */}
                <div className="flex items-end gap-1 h-8">
                  {t.history.map((h, i) => {
                    const max = Math.max(...t.history.map(x => x.amount), t.predicted);
                    const pct = max > 0 ? (h.amount / max) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end">
                        <div className="bg-gray-200 rounded-sm" style={{ height: `${pct}%`, minHeight: h.amount > 0 ? "4px" : "0" }} />
                      </div>
                    );
                  })}
                  {/* Predicted bar */}
                  <div className="flex-1 flex flex-col justify-end">
                    <div className="bg-purple-400 rounded-sm"
                      style={{ height: `${Math.max(...t.history.map(x => x.amount), t.predicted) > 0 ? (t.predicted / Math.max(...t.history.map(x => x.amount), t.predicted)) * 100 : 0}%`, minHeight: t.predicted > 0 ? "4px" : "0" }} />
                  </div>
                </div>

                <div className="flex justify-between text-xs text-gray-300 mt-1">
                  {t.history.map((h) => <span key={h.month}>{h.month.slice(5)}</span>)}
                  <span className="text-purple-400 font-medium">pred</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
