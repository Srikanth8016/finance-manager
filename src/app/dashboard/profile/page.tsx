"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera, Loader2, Save, Trash2, User, DollarSign,
  Globe, Palette, Mail, CheckCircle, AlertCircle,
} from "lucide-react";
import { useTheme, type Theme } from "@/components/ThemeProvider";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  salary: number | null;
  currency: string;
  country: string;
  theme: string;
};

type Toast = { type: "success" | "error"; message: string };

const CURRENCIES = [
  { code: "INR", label: "₹ Indian Rupee" },
  { code: "USD", label: "$ US Dollar" },
  { code: "EUR", label: "€ Euro" },
  { code: "GBP", label: "£ British Pound" },
  { code: "JPY", label: "¥ Japanese Yen" },
  { code: "AUD", label: "A$ Australian Dollar" },
  { code: "CAD", label: "C$ Canadian Dollar" },
  { code: "SGD", label: "S$ Singapore Dollar" },
  { code: "AED", label: "AED UAE Dirham" },
];

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "France", "Singapore", "UAE", "Japan", "Other",
];

const THEMES = [
  {
    value: "light",
    label: "Light",
    desc: "Always light",
    bg: "bg-white", border: "border-gray-300", dot: "bg-yellow-400",
  },
  {
    value: "dark",
    label: "Dark",
    desc: "Always dark",
    bg: "bg-gray-900", border: "border-gray-600", dot: "bg-indigo-500",
  },
  {
    value: "system",
    label: "System",
    desc: "Follows OS setting",
    bg: "bg-gradient-to-r from-white to-gray-900", border: "border-gray-400", dot: "bg-blue-500",
  },
];

export default function ProfilePage() {
  const { theme: activeTheme, setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    name: "",
    salary: "",
    currency: "INR",
    country: "India",
    theme: "light",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── fetch profile ─────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data);
        setForm({
          name: data.name ?? "",
          salary: data.salary?.toString() ?? "",
          currency: data.currency,
          country: data.country,
          theme: data.theme,
        });
        // Sync saved theme into ThemeProvider (only if no localStorage override)
        if (!localStorage.getItem("theme")) {
          setTheme(data.theme as Theme);
        }
        setLoading(false);
      });
  }, []);

  // ── toast auto-dismiss ────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── save profile ──────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setProfile((p) => (p ? { ...p, ...data } : data));
      setToast({ type: "success", message: "Profile saved successfully!" });
    } else {
      setToast({ type: "error", message: data.error || "Failed to save." });
    }
  }

  // ── avatar upload ─────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setToast({ type: "error", message: "Image must be under 2 MB." });
      return;
    }

    setAvatarLoading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
    const data = await res.json();
    setAvatarLoading(false);

    if (res.ok) {
      setProfile((p) => (p ? { ...p, image: data.image } : p));
      setToast({ type: "success", message: "Avatar updated!" });
    } else {
      setToast({ type: "error", message: data.error || "Upload failed." });
    }
    // reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── remove avatar ─────────────────────────────────────────────
  async function handleRemoveAvatar() {
    setAvatarLoading(true);
    await fetch("/api/profile/avatar", { method: "DELETE" });
    setProfile((p) => (p ? { ...p, image: null } : p));
    setAvatarLoading(false);
    setToast({ type: "success", message: "Avatar removed." });
  }

  // ── initials fallback ─────────────────────────────────────────
  function initials(name: string | null, email: string | null) {
    if (name) return name.slice(0, 2).toUpperCase();
    if (email) return email[0].toUpperCase();
    return "U";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-6">Profile & Settings</h1>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle size={16} className="text-green-500 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-red-500 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── Avatar ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Camera size={16} className="text-gray-400" />
            Profile Photo
          </h2>

          <div className="flex items-center gap-5">
            {/* Avatar preview */}
            <div className="relative shrink-0">
              {profile?.image ? (
                <img
                  src={profile.image}
                  alt="avatar"
                  className="w-20 h-20 rounded-2xl object-cover border border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  {initials(profile?.name ?? null, profile?.email ?? null)}
                </div>
              )}
              {avatarLoading && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Upload controls */}
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                <Camera size={14} />
                Upload Photo
              </button>
              {profile?.image && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={avatarLoading}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-gray-600 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              )}
              <p className="text-xs text-gray-400">JPEG, PNG, WEBP · Max 2 MB</p>
            </div>
          </div>
        </div>

        {/* ── Personal Info ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <User size={16} className="text-gray-400" />
            Personal Information
          </h2>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Display Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                maxLength={60}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Email — read only */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Mail size={13} />
                Email Address
              </label>
              <input
                type="email"
                value={profile?.email ?? ""}
                disabled
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
            </div>
          </div>
        </div>

        {/* ── Financial Settings ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <DollarSign size={16} className="text-gray-400" />
            Financial Settings
          </h2>

          <div className="space-y-4">
            {/* Monthly Salary */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                Monthly Salary / Income
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  {CURRENCIES.find((c) => c.code === form.currency)?.code ?? "₹"}
                </span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={form.salary}
                  onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                  placeholder="e.g. 50000"
                  className="w-full pl-12 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Used in AI insights to calculate your savings rate.
              </p>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Regional Settings ───────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Globe size={16} className="text-gray-400" />
            Regional Settings
          </h2>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Country</label>
            <select
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Theme ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Palette size={16} className="text-gray-400" />
            Appearance
          </h2>

          <div className="flex gap-3">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, theme: t.value }))}
                className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  form.theme === t.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* Mini preview swatch */}
                <div
                  className={`w-10 h-7 rounded-md border ${t.bg} ${t.border} flex items-end justify-end p-1`}
                >
                  <div className={`w-2 h-2 rounded-full ${t.dot}`} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${form.theme === t.value ? "text-blue-600" : "text-gray-700"}`}>
                    {t.label}
                  </p>
                  {form.theme === t.value && (
                    <p className="text-xs text-blue-500">Active</p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Theme preference is saved to your profile. Full dark mode UI coming soon.
          </p>
        </div>

        {/* ── Account Info ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Account</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-1">Member Since</p>
              <p className="text-gray-700 font-medium">
                {profile?.createdAt
                  ? new Date((profile as unknown as { createdAt: string }).createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "long", year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">User ID</p>
              <p className="text-gray-400 font-mono text-xs truncate">{profile?.id}</p>
            </div>
          </div>
        </div>

        {/* ── Save Button ─────────────────────────────────────── */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Saving...</>
          ) : (
            <><Save size={16} /> Save Changes</>
          )}
        </button>
      </form>
    </div>
  );
}
