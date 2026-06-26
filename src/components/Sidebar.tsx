"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  MessageSquare,
  Target,
  Upload,
  TrendingUp,
  BarChart2,
  Brain,
  LogOut,
  UserCircle,
} from "lucide-react";

const groups = [
  {
    label: null,
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Finance",
    links: [
      { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/dashboard/budgets",      label: "Budgets",      icon: PieChart },
      { href: "/dashboard/goals",        label: "Goals",        icon: Target },
      { href: "/dashboard/investments",  label: "Investments",  icon: BarChart2 },
    ],
  },
  {
    label: "AI",
    links: [
      { href: "/dashboard/insights",  label: "Insights",    icon: TrendingUp },
      { href: "/dashboard/predict",   label: "Predictions", icon: Brain },
      { href: "/dashboard/chat",      label: "AI Chat",     icon: MessageSquare },
    ],
  },
  {
    label: "Tools",
    links: [
      { href: "/dashboard/upload",  label: "Upload",  icon: Upload },
      { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
    ],
  },
];

// Flat list for mobile bottom nav (most-used only)
const mobileLinks = [
  { href: "/dashboard",               label: "Home",    icon: LayoutDashboard },
  { href: "/dashboard/transactions",  label: "Tx",      icon: ArrowLeftRight },
  { href: "/dashboard/budgets",       label: "Budgets", icon: PieChart },
  { href: "/dashboard/chat",          label: "AI",      icon: MessageSquare },
  { href: "/dashboard/profile",       label: "Profile", icon: UserCircle },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-60 bg-white border-r border-gray-100 flex-col z-30">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 leading-tight">Finance Manager</p>
              <p className="text-[10px] text-gray-400">AI-powered</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {groups.map((group) => (
            <div key={group.label ?? "main"}>
              {group.label && (
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.links.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon size={15} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-gray-100">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 w-full transition-colors"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav (5 key links) ──────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 flex">
        {mobileLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] transition-colors ${
                active ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] text-gray-400"
        >
          <LogOut size={18} />
          Out
        </button>
      </nav>
    </>
  );
}
