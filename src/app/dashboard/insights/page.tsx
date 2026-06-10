"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { format } from "date-fns";

type MonthData = {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  catSpend: Record<string, number>;
};

type CategoryChange = {
  category: string;
  current: number;
  previous: number;
  changePercent: number | null;
};

type InsightsData = {
  months: MonthData[];
  categoryChanges: CategoryChange[];
  topCategory: string;
  aiInsights: string[];
  currentMonth: MonthData;
  prevMonth: MonthData;
};

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (!data) return null;

  const barData = data.months.map((m) => ({
    name: format(new Date(m.month), "MMM"),
    Income: m.income,
    Expenses: m.expenses,
    Savings: m.savings,
  }));

  const savingsChange = data.prevMonth.savings > 0
    ? ((data.currentMonth.savings - data.prevMonth.savings) / data.prevMonth.savings) * 100
    : null;

  const expenseChange = data.prevMonth.expenses > 0
    ? ((data.currentMonth.expenses - data.prevMonth.expenses) / data.prevMonth.expenses) * 100
    : null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Financial Insights</h1>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 mb-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} />
          <h2 className="font-semibold">AI Analysis</h2>
        </div>
        {data.aiInsights.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.aiInsights.map((insight, i) => (
              <div key={i} className="bg-white/15 rounded-xl p-3 text-sm leading-relaxed">
                {insight}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/70">Add more transactions to get AI insights.</p>
        )}
      </div>

      {/* Month comparison cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">This Month Income</p>
          <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(data.currentMonth.income)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">This Month Expenses</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-lg font-bold text-red-500">{formatCurrency(data.currentMonth.expenses)}</p>
            {expenseChange !== null && (
              <span className={`text-xs font-medium flex items-center gap-0.5 ${expenseChange > 0 ? "text-red-400" : "text-green-500"}`}>
                {expenseChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(expenseChange).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">This Month Savings</p>
          <div className="flex items-center gap-2 mt-1">
            <p className={`text-lg font-bold ${data.currentMonth.savings >= 0 ? "text-blue-600" : "text-red-500"}`}>
              {formatCurrency(data.currentMonth.savings)}
            </p>
            {savingsChange !== null && (
              <span className={`text-xs font-medium flex items-center gap-0.5 ${savingsChange >= 0 ? "text-green-500" : "text-red-400"}`}>
                {savingsChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(savingsChange).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Top Category</p>
          <p className="text-sm font-bold text-gray-800 mt-1 truncate">{data.topCategory}</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">3-Month Overview</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Savings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category changes */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Category Trends (vs Last Month)</h2>
        {data.categoryChanges.length === 0 ? (
          <p className="text-sm text-gray-400">No data yet.</p>
        ) : (
          <div className="space-y-3">
            {data.categoryChanges.slice(0, 8).map((c) => (
              <div key={c.category} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm text-gray-700 truncate w-32">{c.category}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full min-w-16 max-w-32">
                    <div
                      className="h-2 bg-blue-400 rounded-full"
                      style={{ width: `${Math.min((c.current / (data.currentMonth.expenses || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-gray-800">{formatCurrency(c.current)}</span>
                  {c.changePercent !== null ? (
                    <span className={`text-xs font-medium flex items-center gap-0.5 w-14 justify-end ${
                      c.changePercent > 10 ? "text-red-500" : c.changePercent < -10 ? "text-green-500" : "text-gray-400"
                    }`}>
                      {c.changePercent > 0 ? <TrendingUp size={12} /> : c.changePercent < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                      {Math.abs(c.changePercent).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 w-14 text-right">new</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
