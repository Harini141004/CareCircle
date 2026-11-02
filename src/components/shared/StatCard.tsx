"use client";

import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "indigo" | "teal" | "violet" | "pink" | "amber" | "emerald" | "rose";
  subtext?: string;
  trend?: { value: string; isPositive?: boolean };
  badge?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  variant = "indigo",
  subtext,
  trend,
  badge,
  loading = false,
  onClick,
}: StatCardProps) {
  const variantStyles = {
    indigo: {
      iconBg: "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900",
      accent: "text-indigo-600 dark:text-indigo-400",
    },
    teal: {
      iconBg: "bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900",
      accent: "text-teal-600 dark:text-teal-400",
    },
    violet: {
      iconBg: "bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900",
      accent: "text-violet-600 dark:text-violet-400",
    },
    pink: {
      iconBg: "bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-900",
      accent: "text-pink-600 dark:text-pink-400",
    },
    amber: {
      iconBg: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900",
      accent: "text-amber-600 dark:text-amber-400",
    },
    emerald: {
      iconBg: "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900",
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    rose: {
      iconBg: "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900",
      accent: "text-rose-600 dark:text-rose-400",
    },
  };

  const style = variantStyles[variant];

  if (loading) {
    return (
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded mt-2" />
        <div className="h-2 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all ${
        onClick
          ? "cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md"
          : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </span>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${style.iconBg}`}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {value}
          </div>
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {badge}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
          {subtext && <span>{subtext}</span>}
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 font-bold ${
                trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
