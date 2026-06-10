import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { startOfMonth, endOfMonth } from "date-fns";
import RecentTransactions from "@/components/RecentTransactions";
import SpendingChart from "@/components/SpendingChart";

type Transaction = {
  id: string; type: string; amount: number; description: string;
  category: string; date: Date; note: string | null;
  userId: string; createdAt: Date; updatedAt: Date;
};
type Budget = {
  id: string; userId: string; category: string; limit: number;
  period: string; createdAt: Date; updatedAt: Date;
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id!;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [transactions, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      orderBy: { date: "desc" },
    }),
    prisma.budget.findMany({ where: { userId } }),
  ]);

  const income = transactions
    .filter((t: Transaction) => t.type === "income")
    .reduce((s: number, t: Transaction) => s + t.amount, 0);

  const expenses = transactions
    .filter((t: Transaction) => t.type === "expense")
    .reduce((s: number, t: Transaction) => s + t.amount, 0);

  const savings = income - expenses;

  const categorySpend: Record<string, number> = {};
  transactions
    .filter((t: Transaction) => t.type === "expense")
    .forEach((t: Transaction) => {
      categorySpend[t.category] = (categorySpend[t.category] || 0) + t.amount;
    });

  const chartData = Object.entries(categorySpend).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6">Dashboard</h1>

      {/* Summary Cards — 1 col mobile, 3 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200">
          <p className="text-xs text-gray-500">Total Income</p>
          <p className="text-xl lg:text-2xl font-bold text-green-600 mt-1">{formatCurrency(income)}</p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>
        <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200">
          <p className="text-xs text-gray-500">Total Expenses</p>
          <p className="text-xl lg:text-2xl font-bold text-red-500 mt-1">{formatCurrency(expenses)}</p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>
        <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200">
          <p className="text-xs text-gray-500">Savings</p>
          <p className={`text-xl lg:text-2xl font-bold mt-1 ${savings >= 0 ? "text-blue-600" : "text-red-500"}`}>
            {formatCurrency(savings)}
          </p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>
      </div>

      {/* Chart + Budget — stacked on mobile, side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200">
          <h2 className="font-semibold text-gray-800 mb-4">Spending by Category</h2>
          <SpendingChart data={chartData} />
        </div>

        <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200">
          <h2 className="font-semibold text-gray-800 mb-4">Budget Usage</h2>
          {budgets.length === 0 ? (
            <p className="text-sm text-gray-400">No budgets set yet.</p>
          ) : (
            <div className="space-y-3">
              {budgets.map((b: Budget) => {
                const spent = categorySpend[b.category] || 0;
                const pct = Math.min((spent / b.limit) * 100, 100);
                const over = spent > b.limit;
                return (
                  <div key={b.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{b.category}</span>
                      <span className={over ? "text-red-500" : "text-gray-500"}>
                        {formatCurrency(spent)} / {formatCurrency(b.limit)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div
                        className={`h-2 rounded-full transition-all ${over ? "bg-red-500" : pct > 80 ? "bg-yellow-400" : "bg-blue-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mt-4 lg:mt-6 bg-white rounded-2xl p-4 lg:p-5 border border-gray-200">
        <h2 className="font-semibold text-gray-800 mb-4">Recent Transactions</h2>
        <RecentTransactions transactions={transactions.slice(0, 5)} />
      </div>
    </div>
  );
}
