"use client";

import React, { useState } from "react";
import { Palette, Sun, Moon, Paintbrush, RotateCcw } from "lucide-react";
import { useTheme, DEFAULT_CUSTOM, type ThemeName, type CustomColors } from "@/context/ThemeContext";

const OPTIONS: { id: ThemeName; label: string; icon: React.ElementType }[] = [
  { id: "light", label: "White", icon: Sun },
  { id: "dark", label: "Black", icon: Moon },
  { id: "custom", label: "Custom", icon: Paintbrush },
];

const FIELDS: { key: keyof CustomColors; label: string }[] = [
  { key: "background", label: "Page background" },
  { key: "surface", label: "Cards & panels" },
  { key: "text", label: "Text" },
  { key: "accent", label: "Accent / buttons" },
  { key: "dialog", label: "Dialog boxes" },
];

export function ThemeSwitcher() {
  const { theme, setTheme, custom, setCustom } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Change theme"
        title="Change theme"
        className="p-2 rounded-xl border border-slate-200 bg-slate-100/90 hover:bg-slate-200/70 text-slate-700 transition-colors"
      >
        <Palette className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200 z-50 p-3 space-y-3">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-1">
              Appearance
            </div>

            <div className="grid grid-cols-3 gap-2">
              {OPTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                    theme === id
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {theme === "custom" && (
              <div className="space-y-2 pt-1 border-t border-slate-100">
                {FIELDS.map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between text-xs text-slate-700">
                    <span>{label}</span>
                    <input
                      type="color"
                      value={custom[key]}
                      onChange={(e) => setCustom({ ...custom, [key]: e.target.value })}
                      className="w-9 h-7 p-0 rounded-md border border-slate-200 bg-transparent cursor-pointer"
                    />
                  </label>
                ))}
                <button
                  onClick={() => setCustom(DEFAULT_CUSTOM)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset custom colors
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
