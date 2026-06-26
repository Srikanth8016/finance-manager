"use client";

interface DaySpend { date: string; amount: number }

function getColor(amount: number, max: number): string {
  if (amount === 0) return "bg-gray-100";
  const ratio = amount / max;
  if (ratio < 0.25) return "bg-green-200";
  if (ratio < 0.5)  return "bg-yellow-300";
  if (ratio < 0.75) return "bg-orange-400";
  return "bg-red-500";
}

export default function SpendingHeatmap({ data }: { data: DaySpend[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-gray-400 gap-2">
        <span className="text-2xl">🗓</span>
        <p className="text-sm">No spending data this month.</p>
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.amount), 1);

  // Build a full month grid (pad to start on correct weekday)
  const firstDate  = new Date(data[0].date);
  const startPad   = firstDate.getDay(); // 0 = Sun
  const byDate     = Object.fromEntries(data.map(d => [d.date.slice(0, 10), d.amount]));

  // Days in month
  const year  = firstDate.getFullYear();
  const month = firstDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { day: number; date: string; amount: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, date: dateStr, amount: byDate[dateStr] ?? 0 });
  }

  const weekLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      {/* Week day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekLabels.map((w, i) => (
          <div key={i} className="text-center text-[10px] text-gray-400 font-medium">{w}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding cells */}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {/* Day cells */}
        {cells.map(cell => (
          <div
            key={cell.date}
            title={cell.amount > 0 ? `${cell.date}: ₹${cell.amount.toLocaleString("en-IN")}` : cell.date}
            className={`aspect-square rounded-sm ${getColor(cell.amount, max)} cursor-default relative group`}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[8px] text-gray-600 opacity-60">
              {cell.day}
            </span>
            {/* Tooltip on hover */}
            {cell.amount > 0 && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                ₹{cell.amount.toLocaleString("en-IN")}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
        <span>Low</span>
        <div className="flex gap-0.5">
          {["bg-gray-100","bg-green-200","bg-yellow-300","bg-orange-400","bg-red-500"].map(c => (
            <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
        </div>
        <span>High</span>
      </div>
    </div>
  );
}
