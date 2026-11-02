"use client";

import React from "react";

export interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  size = "sm",
  showDot = true,
  className = "",
}: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase();

  const getTheme = () => {
    switch (normalized) {
      // Positive / Active / Success
      case "ACTIVE":
      case "VERIFIED":
      case "TAKEN":
      case "PAID":
      case "COMPLETED":
      case "SUCCESS":
      case "NORMAL":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          dot: "bg-emerald-500",
        };

      // Warning / Pending
      case "PENDING":
      case "UPCOMING":
      case "APPROVED":
      case "WARNING":
      case "SHIFT_NOTE":
      case "MEDIUM":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
          dot: "bg-amber-500",
        };

      // Danger / Inactive / Rejected / Missed
      case "INACTIVE":
      case "REJECTED":
      case "MISSED":
      case "CANCELLED":
      case "DANGER":
      case "HIGH":
      case "CRITICAL":
        return {
          bg: "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
          dot: "bg-rose-500",
        };

      // Info / Late / Handover
      case "SKIPPED":
      case "LATE":
      case "HANDOVER":
      case "INFO":
      case "LOW":
      default:
        return {
          bg: "bg-violet-50 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
          dot: "bg-violet-500",
        };
    }
  };

  const theme = getTheme();
  const displayLabel = label || status;

  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-0.5 text-[10px] font-bold"
      : "px-3 py-1 text-xs font-bold";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide uppercase ${theme.bg} ${sizeClasses} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />}
      <span>{displayLabel}</span>
    </span>
  );
}
