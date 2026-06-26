"use client";

interface Check { label: string; ok: boolean }

interface Props {
  score: number;
  label: string;
  color: string;        // tailwind text-* class
  ringColor: string;    // hex stroke colour
  checks: Check[];
}

export default function HealthScoreRing({ score, label, color, ringColor, checks }: Props) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* SVG ring */}
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="10" />
          {/* Progress */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        {/* Score in centre */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold leading-none ${color}`}>{score}</span>
          <span className="text-[10px] text-gray-400 leading-none mt-0.5">/ 100</span>
        </div>
      </div>

      <span className={`text-sm font-semibold ${color}`}>{label}</span>

      {/* Check list */}
      <div className="w-full space-y-1.5">
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-2 text-xs text-gray-600">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${c.ok ? "bg-green-100 text-green-600" : "bg-red-50 text-red-400"}`}>
              {c.ok ? "✓" : "✗"}
            </span>
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}
