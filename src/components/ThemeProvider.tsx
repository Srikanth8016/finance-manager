"use client";

import {
  createContext, useContext, useEffect, useState, useCallback,
} from "react";

export type Theme = "light" | "dark" | "system";

type ThemeCtx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark"; // what is actually applied right now
};

const ThemeContext = createContext<ThemeCtx>({
  theme: "system",
  setTheme: () => {},
  resolved: "light",
});

export function useTheme() {
  return useContext(ThemeContext);
}

// ── helpers ────────────────────────────────────────────────────
function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  return dark ? "dark" : "light";
}

// Map the value stored in DB ("light" | "dark") → Theme
// We extend with "system" as a client-only option persisted in localStorage
function loadTheme(profileTheme: string | null): Theme {
  if (typeof window !== "undefined") {
    const ls = localStorage.getItem("theme") as Theme | null;
    if (ls === "light" || ls === "dark" || ls === "system") return ls;
  }
  if (profileTheme === "dark") return "dark";
  if (profileTheme === "light") return "light";
  return "system";
}

// ── provider ───────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Bootstrap from localStorage (or fall back to "system") on first render
  useEffect(() => {
    const initial = loadTheme(null);
    setThemeState(initial);
    setResolved(applyTheme(initial) as "light" | "dark");
    setMounted(true);
  }, []);

  // Watch system preference when theme === "system"
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(applyTheme("system") as "light" | "dark");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
    setResolved(applyTheme(t) as "light" | "dark");
  }, []);

  // Prevent flash before JS runs
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}
