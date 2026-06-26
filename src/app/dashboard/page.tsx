import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import RecentTransactions from "@/components/RecentTransactions";
import SpendingChart from "@/components/SpendingChart";
import CashFlowChart from "@/components/CashFlowChart";
import FloatingChat from "@/components/FloatingChat";
import HealthScoreRing from "@/components/HealthScoreRing";
import SpendingHeatmap from "@/components/SpendingHeatmap";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank,
  BarChart3, Brain, ArrowRight, Zap, Plus,
} from "lucide-react";

type Tx  = { id: string; type: string; amount: number; description: string; category: string; date: Date; note: string | null; userId: string; createdAt: Date; updatedAt: Date };
type Bgt = { id: string; userId: string; category: string; limit: number; period: string; createdAt: Date; updatedAt: Date };
type Gol = { id: string; title: string; targetAmount: number; currentAmount: number; targetDate: Date };
type Inv = { id: string; currentValue: number; investedAmount: number };

const GOAL_ICONS: Record<string, string> = {
  vacation: "✈️", travel: "✈️", car: "🚗", house: "🏠", home: "🏠",
  emergency: "🆘", hospital: "🏥", health: "💊", education: "📚",
  wedding: "💍", retirement: "🏖️", phone: "📱", laptop: "💻",
  default: "🎯",
};
function goalIcon(title: string): string {
  const lower = title.toLowerCase();
  return Object.entries(GOAL_ICONS).find(([k]) => lower.includes(k))?.[1] ?? GOAL_ICONS.default;
}

function calcHealth(savingsRate: number, budgetsOk: boolean, hasGoals: boolean, hasInvestments: boolean, expenseRatio: number) {
  let score = 0;
  if (savingsRate >= 0.20) score += 30; else if (savingsRate >= 0.10) score += 18; else if (savingsRate > 0) score += 8;
  if (budgetsOk) score += 25;
  if (hasGoals) score += 20;
  if (hasInvestments) score += 15;
  if (expenseRatio < 0.7) score += 10;
  const label    = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs Work";
  const color    = score >= 80 ? "text-green-600" : score >= 60 ? "text-blue-600" : score >= 40 ? "text-yellow-600" : "text-red-500";
  const ringColor= score >= 80 ? "#16a34a" : score >= 60 ? "#2563eb" : score >= 40 ? "#ca8a04" : "#ef4444";
  return {
    score, label, color, ringColor,
    checks: [
      { label: "Savings Rate ≥ 10%", ok: savingsRate >= 0.10 },
      { label: "Budget Control",     ok: budgetsOk },
      { label: "Goals Set",          ok: hasGoals },
      { label: "Investing",          ok: hasInvestments },
      { label: "Expense Ratio < 70%",ok: expenseRatio < 0.70 },
    ],
  };
}

function pctChange(curr: number, prev: number) {
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function PctBadge({ pct, inverse = false }: { pct: number | null; inverse?: boolean }) {
  if (pct === null) return <span className="text-[10px] text-gray-400">—</span>;
  const good = inverse ? pct < 0 : pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${good ? "text-green-600" : "text-red-500"}`}>
      {pct > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

export default async function DashboardPage() {
  const session  = await getServerSession(authOptions);
  const user     = session?.user as { id?: string; name?: string; email?: string } | undefined;
  const userId   = user?.id!;
  const userName = user?.name ?? user?.email?.split("@")[0] ?? "there";
  const now      = new Date();

  const [transactions, prevTx, budgets, goals, investments, hist] = await Promise.all([
    prisma.transaction.findMany({ where: { userId, date: { gte: startOfMonth(now), lte: endOfMonth(now) } }, orderBy: { date: "desc" } }),
    prisma.transaction.findMany({ where: { userId, date: { gte: startOfMonth(subMonths(now,1)), lte: endOfMonth(subMonths(now,1)) } } }),
    prisma.budget.findMany({ where: { userId } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.investment.findMany({ where: { userId } }),
    prisma.transaction.findMany({ where: { userId, date: { gte: startOfMonth(subMonths(now,11)) } } }),
  ]);

  // ── KPI numbers ───────────────────────────────────────────────────────────────
  const income   = (transactions as Tx[]).filter(t => t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expenses = (transactions as Tx[]).filter(t => t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const savings  = income - expenses;
  const prevIncome   = (prevTx as Tx[]).filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const prevExpenses = (prevTx as Tx[]).filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const prevSavings  = prevIncome - prevExpenses;
  const savingsRate  = income > 0 ? savings / income : 0;

  // ── Category spend ─────────────────────────────────────────────────────────────
  const catSpend: Record<string,number> = {};
  (transactions as Tx[]).filter(t=>t.type==="expense").forEach(t=>{ catSpend[t.category]=(catSpend[t.category]||0)+t.amount; });
  const prevCatSpend: Record<string,number> = {};
  (prevTx as Tx[]).filter(t=>t.type==="expense").forEach(t=>{ prevCatSpend[t.category]=(prevCatSpend[t.category]||0)+t.amount; });
  const chartData = Object.entries(catSpend).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);

  // ── Budget items ───────────────────────────────────────────────────────────────
  const budgetItems = (budgets as Bgt[]).map(b=>{
    const spent=catSpend[b.category]||0, pct=b.limit>0?(spent/b.limit)*100:0;
    const remaining=b.limit-spent, over=spent>b.limit;
    return { ...b, spent, pct, remaining, over, status: over?"over":pct>80?"warning":"ok" };
  });
  const budgetsOk = budgetItems.every(b=>!b.over);

  // ── Investments ────────────────────────────────────────────────────────────────
  const portfolioValue   = (investments as Inv[]).reduce((s,i)=>s+i.currentValue,0);
  const portfolioCost    = (investments as Inv[]).reduce((s,i)=>s+i.investedAmount,0);
  const portfolioGain    = portfolioValue - portfolioCost;
  const portfolioGainPct = portfolioCost>0?(portfolioGain/portfolioCost)*100:0;
  const netWorth         = portfolioValue + (goals as Gol[]).reduce((s,g)=>s+g.currentAmount,0) + savings;

  // ── Health score ───────────────────────────────────────────────────────────────
  const health = calcHealth(savingsRate, budgetsOk, goals.length>0, investments.length>0, income>0?expenses/income:1);

  // ── Goals top 3 ───────────────────────────────────────────────────────────────
  const topGoals = (goals as Gol[]).slice(0,3).map(g=>{
    const pct      = g.targetAmount>0?(g.currentAmount/g.targetAmount)*100:0;
    const daysLeft = Math.max(0,Math.ceil((new Date(g.targetDate).getTime()-now.getTime())/86400000));
    const months   = Math.floor(daysLeft/30);
    const timeLeft = months>0?`${months} month${months>1?"s":""} left`:`${daysLeft}d left`;
    return { ...g, pct, daysLeft, timeLeft, icon: goalIcon(g.title) };
  });

  // ── Rich AI insights (structured cards) ──────────────────────────────────────
  type InsightCard = { title: string; detail: string; suggestion: string; saving: string | null };
  const insightCards: InsightCard[] = [];
  const topCat = chartData[0];
  if (topCat) {
    const prevAmt   = prevCatSpend[topCat.name] || 0;
    const changePct = prevAmt > 0 ? ((topCat.value - prevAmt) / prevAmt) * 100 : null;
    const pctOfExp  = expenses > 0 ? ((topCat.value / expenses) * 100).toFixed(0) : "0";
    insightCards.push({
      title:      `${topCat.name} — ${pctOfExp}% of expenses`,
      detail:     `You spent ${formatCurrency(topCat.value)} on ${topCat.name} this month.${changePct !== null ? ` That's ${changePct > 0 ? "+" : ""}${changePct.toFixed(0)}% vs last month.` : ""}`,
      suggestion: topCat.name === "Food & Dining"
        ? "Try cooking at home twice a week."
        : topCat.name === "Shopping"
        ? "Use a 24-hour rule before non-essential purchases."
        : `Review your ${topCat.name} spending for easy cuts.`,
      saving: topCat.value > 2000 ? formatCurrency(Math.round(topCat.value * 0.2)) + "/month" : null,
    });
  }
  const overBudget = budgetItems.filter(b=>b.over);
  if (overBudget.length > 0) {
    const b = overBudget[0];
    insightCards.push({
      title:      `⚠️ ${b.category} budget exceeded`,
      detail:     `You're over by ${formatCurrency(Math.abs(b.remaining))} (${formatCurrency(b.spent)} of ${formatCurrency(b.limit)} limit).`,
      suggestion: `Pause non-essential ${b.category.toLowerCase()} spending for the rest of the month.`,
      saving:     null,
    });
  }
  if (savingsRate < 0.1 && income > 0) {
    const gap = Math.round(income * 0.2 - savings);
    insightCards.push({
      title:      "Savings rate below 10%",
      detail:     `You saved ${(savingsRate*100).toFixed(0)}% of income. The recommended target is 20%.`,
      suggestion: `Cutting ${formatCurrency(gap)} from expenses this month gets you to 20%.`,
      saving:     formatCurrency(gap) + "/month",
    });
  }
  if (insightCards.length === 0) {
    insightCards.push({
      title: "Add transactions to get insights",
      detail: "Your AI advisor needs data to give you personalised recommendations.",
      suggestion: "Start by logging your income and daily expenses.",
      saving: null,
    });
  }

  // ── Cash flow 12 months ────────────────────────────────────────────────────────
  const cashFlow = Array.from({length:12},(_,i)=>{
    const ms=startOfMonth(subMonths(now,11-i)), me=endOfMonth(subMonths(now,11-i));
    const mx=(hist as Tx[]).filter(t=>t.date>=ms&&t.date<=me);
    const mi=mx.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
    const me2=mx.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
    return { month:format(ms,"MMM"), income:mi, expenses:me2, savings:mi-me2 };
  });

  // ── Heatmap: daily spend this month ───────────────────────────────────────────
  const dailySpend: Record<string,number> = {};
  (transactions as Tx[]).filter(t=>t.type==="expense").forEach(t=>{
    const d = new Date(t.date).toISOString().slice(0,10);
    dailySpend[d] = (dailySpend[d]||0) + t.amount;
  });
  const heatmapData = Object.entries(dailySpend).map(([date,amount])=>({date,amount})).sort((a,b)=>a.date.localeCompare(b.date));
  // pad to first of month if no data yet
  if (heatmapData.length === 0) {
    heatmapData.push({ date: format(startOfMonth(now),"yyyy-MM-dd"), amount: 0 });
  }

  return (
    <>
      <div className="space-y-5 pb-8">

        {/* ── Welcome + Quick Actions ─────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Welcome back, {userName} 👋</h1>
            <p className="text-sm text-gray-400 mt-0.5">{format(now,"EEEE, d MMMM yyyy")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { href:"/dashboard/transactions", label:"+ Transaction", cls:"bg-blue-600 text-white hover:bg-blue-700" },
              { href:"/dashboard/upload",       label:"+ Upload",      cls:"bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
              { href:"/dashboard/budgets",      label:"+ Budget",      cls:"bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
              { href:"/dashboard/goals",        label:"+ Goal",        cls:"bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
              { href:"/dashboard/chat",         label:"Ask AI 🤖",     cls:"bg-white border border-blue-200 text-blue-600 hover:bg-blue-50" },
            ].map(({href,label,cls})=>(
              <Link key={href} href={href} className={`text-xs font-medium px-3 py-2 rounded-xl transition-colors ${cls}`}>{label}</Link>
            ))}
          </div>
        </div>

        {/* ── Health Score + KPI row ──────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

          {/* Health Score — circular */}
          <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Health Score</p>
              <Zap size={13} className="text-yellow-400" />
            </div>
            <HealthScoreRing
              score={health.score}
              label={health.label}
              color={health.color}
              ringColor={health.ringColor}
              checks={health.checks}
            />
          </div>

          {/* Income */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-medium">Income</p>
              <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
                <Wallet size={15} className="text-green-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xl font-bold text-green-600">{formatCurrency(income)}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <PctBadge pct={pctChange(income,prevIncome)} />
                <span className="text-[10px] text-gray-400">vs last month</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 border-t border-gray-50 pt-2">
              Last month: {formatCurrency(prevIncome)}
            </p>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-medium">Expenses</p>
              <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                <CreditCard size={15} className="text-red-500" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xl font-bold text-red-500">{formatCurrency(expenses)}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <PctBadge pct={pctChange(expenses,prevExpenses)} inverse />
                <span className="text-[10px] text-gray-400">vs last month</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 border-t border-gray-50 pt-2">
              Last month: {formatCurrency(prevExpenses)}
            </p>
          </div>

          {/* Savings */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-medium">Savings</p>
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <PiggyBank size={15} className="text-blue-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className={`text-xl font-bold ${savings>=0?"text-blue-600":"text-red-500"}`}>{formatCurrency(savings)}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <PctBadge pct={pctChange(savings,prevSavings)} />
                <span className="text-[10px] text-gray-400">vs last month</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 border-t border-gray-50 pt-2">
              {income>0?`${(savingsRate*100).toFixed(0)}% of income`:"No income recorded"}
            </p>
          </div>

          {/* Net Worth */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-medium">Net Worth</p>
              <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
                <BarChart3 size={15} className="text-purple-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xl font-bold text-purple-600">{formatCurrency(netWorth)}</p>
              {portfolioValue>0 && (
                <div className={`flex items-center gap-0.5 mt-1 text-xs font-semibold ${portfolioGain>=0?"text-green-600":"text-red-500"}`}>
                  {portfolioGain>=0?<TrendingUp size={11}/>:<TrendingDown size={11}/>}
                  {portfolioGain>=0?"+":""}{formatCurrency(portfolioGain)} ({portfolioGainPct.toFixed(1)}%)
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 border-t border-gray-50 pt-2">
              Portfolio + Goals + Savings
            </p>
          </div>
        </div>

        {/* ── Cash Flow Chart ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200">
          <h2 className="font-semibold text-gray-800 mb-4">Cash Flow — Last 12 Months</h2>
          <CashFlowChart data={cashFlow} />
        </div>

        {/* ── Spending Chart + Budget ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Spending by Category</h2>
              <span className="text-xs text-gray-400">{format(now,"MMMM")}</span>
            </div>
            <SpendingChart data={chartData} />
          </div>

          <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Budget Usage</h2>
              <Link href="/dashboard/budgets" className="text-xs text-blue-500 hover:underline flex items-center gap-1">Manage <ArrowRight size={11}/></Link>
            </div>
            {budgetItems.length===0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                <span className="text-3xl">📊</span>
                <p className="text-sm">No budgets set yet.</p>
                <Link href="/dashboard/budgets" className="mt-1 inline-flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors"><Plus size={11}/>Set Budget</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {budgetItems.map(b=>(
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-gray-700">{b.category}</span>
                      <div className="flex items-center gap-2">
                        {b.status==="over"    && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">Over!</span>}
                        {b.status==="warning" && <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full">⚠ Almost</span>}
                        <span className={`text-xs font-medium ${b.over?"text-red-500":"text-gray-500"}`}>{formatCurrency(b.spent)} / {formatCurrency(b.limit)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${b.over?"bg-red-500":b.status==="warning"?"bg-yellow-400":"bg-blue-500"}`} style={{width:`${Math.min(b.pct,100)}%`}}/>
                    </div>
                    <p className={`text-[10px] mt-1 font-medium ${b.over?"text-red-400":"text-gray-400"}`}>
                      {b.over?`Over by ${formatCurrency(Math.abs(b.remaining))}`:`${formatCurrency(b.remaining)} remaining`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── AI Insights (structured cards) ──────────────────── */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 lg:p-5 border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center"><Brain size={14} className="text-white"/></div>
            <h2 className="font-semibold text-gray-800">AI Recommendations</h2>
            <Link href="/dashboard/insights" className="ml-auto text-xs text-blue-600 hover:underline flex items-center gap-1">Full analysis <ArrowRight size={11}/></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {insightCards.map((ins,i)=>(
              <div key={i} className="bg-white/80 rounded-xl p-3.5 border border-blue-100 flex flex-col gap-2">
                <p className="text-sm font-semibold text-gray-800">💡 {ins.title}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{ins.detail}</p>
                <div className="bg-blue-50 rounded-lg px-2.5 py-2 mt-auto">
                  <p className="text-[11px] font-semibold text-blue-700 mb-0.5">Suggestion</p>
                  <p className="text-[11px] text-blue-600">{ins.suggestion}</p>
                  {ins.saving && <p className="text-[11px] font-bold text-green-600 mt-1">💰 Saves ~{ins.saving}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Portfolio + Goals + Heatmap ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Portfolio */}
          <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Portfolio</h2>
              <Link href="/dashboard/investments" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View <ArrowRight size={11}/></Link>
            </div>
            {investments.length===0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <span className="text-4xl">📈</span>
                <p className="text-sm font-medium text-gray-700">Portfolio Value</p>
                <p className="text-2xl font-bold text-gray-300">₹0</p>
                <p className="text-xs text-gray-400 text-center">Start building your portfolio.<br/>Track stocks, MF, FD, and more.</p>
                <Link href="/dashboard/investments" className="inline-flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl transition-colors"><Plus size={11}/>Add Investment</Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(portfolioValue)}</p>
                  <div className={`flex items-center gap-1 mt-0.5 text-sm font-semibold ${portfolioGain>=0?"text-green-600":"text-red-500"}`}>
                    {portfolioGain>=0?<TrendingUp size={14}/>:<TrendingDown size={14}/>}
                    {portfolioGain>=0?"+":""}{formatCurrency(portfolioGain)}
                    <span className="text-xs font-medium">({portfolioGainPct>=0?"+":""}{portfolioGainPct.toFixed(2)}%)</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-2 space-y-1">
                  <p className="text-xs text-gray-400">Today's gain: <span className={`font-semibold ${portfolioGain>=0?"text-green-600":"text-red-500"}`}>{portfolioGain>=0?"+":""}{formatCurrency(portfolioGain)}</span></p>
                  <p className="text-xs text-gray-400">Invested: {formatCurrency(portfolioCost)}</p>
                  <p className="text-xs text-gray-400">{investments.length} position{investments.length!==1?"s":""}</p>
                </div>
              </div>
            )}
          </div>

          {/* Goals */}
          <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Savings Goals</h2>
              <Link href="/dashboard/goals" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View <ArrowRight size={11}/></Link>
            </div>
            {topGoals.length===0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <span className="text-4xl">🎯</span>
                <p className="text-xs text-gray-400 text-center">No goals yet.<br/>Set targets for vacations, gadgets, emergencies.</p>
                <Link href="/dashboard/goals" className="inline-flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl transition-colors"><Plus size={11}/>Set a Goal</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {topGoals.map(g=>(
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><span>{g.icon}</span>{g.title}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{g.timeLeft}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full mb-1 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${g.pct>=100?"bg-green-500":g.pct>=60?"bg-blue-500":"bg-yellow-400"}`} style={{width:`${Math.min(g.pct,100)}%`}}/>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {formatCurrency(g.currentAmount)} of {formatCurrency(g.targetAmount)} · <span className="font-semibold">{g.pct.toFixed(0)}%</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Spending Heatmap */}
          <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Spending Calendar</h2>
              <span className="text-xs text-gray-400">{format(now,"MMMM")}</span>
            </div>
            <SpendingHeatmap data={heatmapData} />
          </div>
        </div>

        {/* ── Recent Transactions ──────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Recent Transactions</h2>
            <Link href="/dashboard/transactions" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View all <ArrowRight size={11}/></Link>
          </div>
          <RecentTransactions transactions={(transactions as Tx[]).slice(0,7)} />
        </div>

      </div>
      <FloatingChat />
    </>
  );
}
