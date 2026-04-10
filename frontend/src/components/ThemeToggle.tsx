"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch
  if (!mounted) {
    return <div className="w-[52px] h-[28px]" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative w-[52px] h-[28px] rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #1e293b 0%, #334155 100%)"
          : "linear-gradient(135deg, #F5DEB3 0%, #DEB887 100%)",
      }}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={isDark ? "Switch to Saffron Cream" : "Switch to Dark"}
    >
      {/* Track highlight */}
      <span
        className="absolute inset-0 rounded-full opacity-20"
        style={{
          boxShadow: isDark
            ? "inset 0 1px 3px rgba(0,0,0,0.4)"
            : "inset 0 1px 3px rgba(0,0,0,0.15)",
        }}
      />

      {/* Thumb */}
      <span
        className="absolute top-[3px] w-[22px] h-[22px] rounded-full shadow-md transition-all duration-300 flex items-center justify-center text-xs"
        style={{
          left: isDark ? "3px" : "27px",
          background: isDark
            ? "linear-gradient(135deg, #1e293b, #0f172a)"
            : "linear-gradient(135deg, #FFF8F0, #FFE8CC)",
          boxShadow: isDark
            ? "0 1px 4px rgba(0,0,0,0.5)"
            : "0 1px 4px rgba(180,130,60,0.3)",
        }}
      >
        {isDark ? (
          // Moon icon
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          // Sun icon
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C47818" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </span>
    </button>
  );
}
