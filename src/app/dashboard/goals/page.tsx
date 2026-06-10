"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil, Target, X, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { differenceInMonths, format } from "date-fns";

type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
};

type Projection = {
  monthsLeft: number;
  monthlyRequired: number;
  onTrack: boolean;
  projectedAmount: number;
};

function calcProjection(goal: Goal): Projection {
  const monthsLeft = Math.max(differenceInMonths(new Date(goal.targetDate), new Date()), 1);
  const remaining = goal.targetAmount - goal.currentAmount;
  const monthlyRequired = remaining / monthsLeft;
  // Assume 7% annual return (SIP-like)
  const monthlyRate = 0.07 / 12;
  const projectedAmount = goal.currentAmount + monthlyRequired * ((Math.pow(1 + monthlyRate, monthsLeft) - 1) / monthlyRate);
  const onTrack = projectedAmount >= goal.targetAmount;
  return { monthsLeft, monthlyRequired, onTrack, projectedAmount };
}

function GoalModal({ goal, onClose, onSaved }: {
  goal?: Goal | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!goal;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: goal?.title ?? "",
    targetAmount: goal?.targetAmount?.toString() ?? "",
    currentAmount: goal?.currentAmount?.toString() ?? "0",
    targetDate: goal?.targetDate
      ? new Date(goal.targetDate).toISOString().split("T")[0]
      : "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = isEdit ? `/api/goals/${goal!.id}` : "/api/goals";
    await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">{isEdit ? "Edit Goal" : "New Goal"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Goal Title</label>
            <input
              required value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Buy a car, Emergency fund"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Target Amount (₹)</label>
            <input
              type="number" required min="1" value={form.targetAmount}
              onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
              placeholder="e.g. 1000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Already Saved (₹)</label>
            <input
              type="number" min="0" value={form.currentAmount}
              onChange={(e) => setForm((f) => ({ ...f, currentAmount: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Target Date</label>
            <input
              type="date" required value={form.targetDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? "Save" : "Create Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/goals");
    setGoals(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    fetchGoals();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Goal Planner</h1>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New Goal</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={28} /></div>
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Target size={28} className="text-blue-400" />
          </div>
          <p className="text-gray-600 font-medium">No goals yet</p>
          <p className="text-gray-400 text-sm mt-1">Set a savings goal and track your progress.</p>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const proj = calcProjection(goal);
            const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

            return (
              <div key={goal.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Target by {format(new Date(goal.targetDate), "MMM yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      proj.onTrack ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
                    }`}>
                      {proj.onTrack ? "On Track" : "Needs Attention"}
                    </span>
                    <button onClick={() => { setEditing(goal); setShowModal(true); }}
                      className="text-gray-400 hover:text-blue-500 p-1">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(goal.id)}
                      className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium text-gray-800">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full">
                    <div
                      className={`h-3 rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatCurrency(goal.currentAmount)} saved</span>
                    <span>{formatCurrency(goal.targetAmount)} goal</span>
                  </div>
                </div>

                {/* AI Projection */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-600 mb-2">AI Projection</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-400">Monthly needed</p>
                      <p className="text-sm font-bold text-blue-600">{formatCurrency(Math.ceil(proj.monthlyRequired))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Months left</p>
                      <p className="text-sm font-bold text-gray-700">{proj.monthsLeft}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Still needed</p>
                      <p className="text-sm font-bold text-gray-700">
                        {formatCurrency(Math.max(goal.targetAmount - goal.currentAmount, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Last updated</p>
                      <p className="text-sm text-gray-500">{formatDate(goal.targetDate)}</p>
                    </div>
                  </div>
                  {!proj.onTrack && (
                    <p className="text-xs text-yellow-600 mt-2 bg-yellow-50 rounded-lg px-2 py-1.5">
                      Save {formatCurrency(Math.ceil(proj.monthlyRequired))}/month to reach your goal by {format(new Date(goal.targetDate), "MMM yyyy")}.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <GoalModal
          goal={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchGoals(); }}
        />
      )}
    </div>
  );
}
