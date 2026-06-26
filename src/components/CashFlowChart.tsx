"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface CashFlowPoint {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

function formatK(val: number) {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000)   return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${val}`;
}

export default function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <span className="text-3xl mb-2">📉</span>
        <p className="text-sm">Not enough data yet.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatK}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(val: number, name: string) => [
            `₹${val.toLocaleString("en-IN")}`,
            name.charAt(0).toUpperCase() + name.slice(1),
          ]}
          contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(val) => <span style={{ fontSize: 11, color: "#6b7280" }}>{val}</span>}
        />
        <Line type="monotone" dataKey="income"   stroke="#10b981" strokeWidth={2} dot={false} name="Income" />
        <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses" />
        <Line type="monotone" dataKey="savings"  stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="4 2" name="Savings" />
      </LineChart>
    </ResponsiveContainer>
  );
}
