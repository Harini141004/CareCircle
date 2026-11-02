"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeName = "light" | "dark" | "custom";

export interface CustomColors {
  background: string;
  surface: string;
  text: string;
  accent: string;
  dialog: string;
}

export const DEFAULT_CUSTOM: CustomColors = {
  background: "#fdf2f8",
  surface: "#ffffff",
  text: "#3b0a2a",
  accent: "#db2777",
  dialog: "#4a044e",
};

export const THEME_STORAGE_KEY = "carecircle-theme";
export const CUSTOM_STORAGE_KEY = "carecircle-theme-custom";

/** Returns true when a hex color is dark (used to pick readable text). */
export function isDarkColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

const CUSTOM_VARS = ["--t-bg", "--t-surface", "--t-fg", "--t-accent", "--dialog-bg", "--dialog-fg"];

export function applyTheme(theme: ThemeName, custom: CustomColors) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  CUSTOM_VARS.forEach((v) => root.style.removeProperty(v));

  let dark = theme === "dark";
  if (theme === "custom") {
    root.style.setProperty("--t-bg", custom.background);
    root.style.setProperty("--t-surface", custom.surface);
    root.style.setProperty("--t-fg", custom.text);
    root.style.setProperty("--t-accent", custom.accent);
    root.style.setProperty("--dialog-bg", custom.dialog);
    root.style.setProperty("--dialog-fg", isDarkColor(custom.dialog) ? "#ffffff" : "#0f172a");
    dark = isDarkColor(custom.background);
  }
  root.setAttribute("data-tone", dark ? "dark" : "light");
  root.style.colorScheme = dark ? "dark" : "light";
}

interface ThemeContextValue {
  theme: ThemeName;
  custom: CustomColors;
  setTheme: (t: ThemeName) => void;
  setCustom: (c: CustomColors) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("light");
  const [custom, setCustomState] = useState<CustomColors>(DEFAULT_CUSTOM);

  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
      const c = localStorage.getItem(CUSTOM_STORAGE_KEY);
      if (t === "light" || t === "dark" || t === "custom") setThemeState(t);
      if (c) setCustomState({ ...DEFAULT_CUSTOM, ...JSON.parse(c) });
    } catch {}
  }, []);

  useEffect(() => {
    applyTheme(theme, custom);
  }, [theme, custom]);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    try { localStorage.setItem(THEME_STORAGE_KEY, t); } catch {}
  }, []);

  const setCustom = useCallback((c: CustomColors) => {
    setCustomState(c);
    try { localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(c)); } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, custom, setTheme, setCustom }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/** Inline script run before first paint so the saved theme never flashes. */
export const themeInitScript = `(function(){try{
var t=localStorage.getItem('${THEME_STORAGE_KEY}');
if(t!=='light'&&t!=='dark'&&t!=='custom')t='light';
var r=document.documentElement;r.setAttribute('data-theme',t);
var dark=t==='dark';
if(t==='custom'){
var c=JSON.parse(localStorage.getItem('${CUSTOM_STORAGE_KEY}')||'null')||${JSON.stringify(DEFAULT_CUSTOM)};
function lum(h){var n=parseInt(h.replace('#',''),16);return(0.299*((n>>16)&255)+0.587*((n>>8)&255)+0.114*(n&255))/255}
r.style.setProperty('--t-bg',c.background);r.style.setProperty('--t-surface',c.surface);
r.style.setProperty('--t-fg',c.text);r.style.setProperty('--t-accent',c.accent);
r.style.setProperty('--dialog-bg',c.dialog);
r.style.setProperty('--dialog-fg',lum(c.dialog)<0.5?'#ffffff':'#0f172a');
dark=lum(c.background)<0.5;}
r.setAttribute('data-tone',dark?'dark':'light');r.style.colorScheme=dark?'dark':'light';
}catch(e){}})();`;
