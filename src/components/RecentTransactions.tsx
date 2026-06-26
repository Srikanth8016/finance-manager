import { formatCurrency, formatDate } from "@/lib/utils";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
};

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

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining":   "bg-orange-100 text-orange-600",
  "Transport":       "bg-blue-100 text-blue-600",
  "Shopping":        "bg-pink-100 text-pink-600",
  "Entertainment":   "bg-purple-100 text-purple-600",
  "Health":          "bg-red-100 text-red-600",
  "Education":       "bg-cyan-100 text-cyan-600",
  "Bills & Utilities":"bg-yellow-100 text-yellow-700",
  "Travel":          "bg-sky-100 text-sky-600",
  "Housing":         "bg-stone-100 text-stone-600",
  "Salary":          "bg-green-100 text-green-700",
  "Freelance":       "bg-teal-100 text-teal-700",
  "Investment":      "bg-indigo-100 text-indigo-600",
  "Other":           "bg-gray-100 text-gray-600",
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(date);
}

export default function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        No transactions yet. Add your first one!
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((t) => {
        const icon  = CATEGORY_ICONS[t.category] ?? "💰";
        const color = CATEGORY_COLORS[t.category] ?? "bg-gray-100 text-gray-600";

        return (
          <div
            key={t.id}
            className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {/* Category icon bubble */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${color}`}>
              {icon}
            </div>

            {/* Description + meta */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full ${color}`}>
                  {t.category}
                </span>
                <span className="text-[10px] text-gray-400">{timeAgo(t.date)}</span>
              </div>
            </div>

            {/* Amount */}
            <span className={`text-sm font-bold shrink-0 ${t.type === "income" ? "text-green-600" : "text-red-500"}`}>
              {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
