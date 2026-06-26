"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#ec4899","#06b6d4","#84cc16","#f97316",
];

const CATEGORY_ICONS: Record<string, string> = {
  "Food & Dining": "🍔",
  "Transport": "🚕",
  "Shopping": "🛍",
  "Entertainment": "🎬",
  "Health": "💊",
  "Education": "📚",
  "Bills & Utilities": "⚡",
  "Travel": "✈️",
  "Housing": "🏠",
  "Salary": "💼",
  "Freelance": "💻",
  "Investment": "📈",
  "Other": "💰",
};

interface ChartEntry { name: string; value: number }

export default function SpendingChart({ data }: { data: ChartEntry[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
        <span className="text-3xl mb-2">📊</span>
        <p className="text-sm">No expense data yet.</p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, ""]}
            contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend with amounts and percentages */}
      <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
        {data
          .slice()
          .sort((a, b) => b.value - a.value)
          .map((entry, i) => {
            const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
            const icon = CATEGORY_ICONS[entry.name] ?? "💰";
            return (
              <div key={entry.name} className="flex items-center gap-2 text-sm">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-base leading-none">{icon}</span>
                <span className="text-gray-700 flex-1 truncate">{entry.name}</span>
                <span className="text-gray-400 text-xs">{pct}%</span>
                <span className="font-semibold text-gray-800 text-xs">
                  ₹{entry.value.toLocaleString("en-IN")}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
