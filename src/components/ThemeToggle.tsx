"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "umh-theme";

/**
 * Reads the current theme from the <html data-theme="..."> attribute that the
 * inline FOUC-prevention script in `layout.tsx` set before React hydrated. We
 * do NOT compute it from window.matchMedia here, because we want the toggle to
 * mirror exactly whatever the page is currently rendering.
 */
function readDocTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const value = document.documentElement.getAttribute("data-theme");
  return value === "dark" ? "dark" : "light";
}

function applyTheme(next: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", next);
  document.documentElement.style.colorScheme = next;
}

export function ThemeToggle() {
  // Render with a neutral default for the server; the real value is wired up
  // on mount so that hydration doesn't mismatch when the user has dark mode.
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readDocTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (private mode, quota); the in-page
      // toggle still works for this session even if persistence fails.
    }
  }

  const isDark = theme === "dark";
  const label = isDark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي";

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle"
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      // Until mount we don't know which icon to draw; render a placeholder of
      // the same size so layout doesn't shift after hydration.
      suppressHydrationWarning
    >
      {mounted ? (
        isDark ? (
          <Sun size={16} strokeWidth={1.8} aria-hidden />
        ) : (
          <Moon size={16} strokeWidth={1.8} aria-hidden />
        )
      ) : (
        <span aria-hidden style={{ display: "inline-block", width: 16, height: 16 }} />
      )}
    </button>
  );
}
