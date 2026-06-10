import { formatCurrency, formatDate } from "@/lib/utils";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
};

export default function RecentTransactions({
  transactions,
}: {
  transactions: Transaction[];
}) {
  if (transactions.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        No transactions yet. Add your first one!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              t.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
            }`}>
              {t.type === "income" ? "+" : "-"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
              <p className="text-xs text-gray-400 truncate">{t.category} · {formatDate(t.date)}</p>
            </div>
          </div>
          <span className={`text-sm font-semibold shrink-0 ${
            t.type === "income" ? "text-green-600" : "text-red-500"
          }`}>
            {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
