"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";

export interface ToastMessage {
  id?: string;
  message: string;
  type?: "success" | "error" | "info";
}

export function Toast({
  message,
  type = "success",
  onClose,
  duration = 4000,
}: {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgStyles =
    type === "success"
      ? "bg-emerald-950/95 border-emerald-700 text-emerald-200"
      : type === "error"
      ? "bg-rose-950/95 border-rose-700 text-rose-200"
      : "bg-indigo-950/95 border-indigo-700 text-indigo-200";

  const Icon =
    type === "success"
      ? CheckCircle2
      : type === "error"
      ? AlertCircle
      : Info;

  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 ${bgStyles}`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-xs font-semibold max-w-sm">{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors ml-2"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
