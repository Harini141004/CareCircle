"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, CheckCheck, AlertTriangle, Pill, Calendar, HeartPulse, Trash2, X, Mail, Loader2, Settings2 } from "lucide-react";

interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "danger";
  type: string;
  isRead: boolean;
  createdAt: string;
  patient?: {
    name: string;
    avatarColor: string;
  };
}

export function AlertsDrawer() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailSentId, setEmailSentId] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.status === 401) {
        // Not logged in yet
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Quietly suppress background polling network blips
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/alerts", { method: "PATCH" });
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking alerts read:", err);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "PATCH" });
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, isRead: true } : a));
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error("Mark one read error:", err);
    }
  };

  const deleteAlert = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (res.ok) {
        const wasUnread = alerts.find(a => a.id === id)?.isRead === false;
        setAlerts((prev) => prev.filter((a) => a.id !== id));
        if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error("Delete alert error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const clearAllAlerts = async () => {
    if (!confirm("Clear all alerts? This cannot be undone.")) return;
    try {
      await Promise.all(alerts.map((a) => fetch(`/api/alerts/${a.id}`, { method: "DELETE" })));
      setAlerts([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("Clear all alerts error:", err);
    }
  };

  const sendEmail = async (id: string) => {
    setSendingEmailId(id);
    try {
      await fetch(`/api/alerts/${id}/notify`, { method: "POST" });
      setEmailSentId(id);
      setTimeout(() => setEmailSentId(null), 3000);
    } catch (err) {
      console.error("Send email error:", err);
    } finally {
      setSendingEmailId(null);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "REFILL_DUE":
      case "MISSED_MED":
        return <Pill className="w-4 h-4 text-amber-600" />;
      case "UPCOMING_APPOINTMENT":
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case "VITALS_WARNING":
        return <HeartPulse className="w-4 h-4 text-rose-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-600" />;
    }
  };

  const severityBg: Record<string, string> = {
    danger: "border-l-4 border-rose-500 dark:border-rose-700",
    warning: "border-l-4 border-amber-500 dark:border-amber-600",
    info: "border-l-0",
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        title="Notifications & Alerts"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Cross-Patient Alerts
                </span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark read
                  </button>
                )}
                {alerts.length > 0 && (
                  <button
                    onClick={clearAllAlerts}
                    className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors"
                    title="Clear all alerts"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear all
                  </button>
                )}
                <Link
                  href="/settings"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Notification Settings"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {alerts.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No active alerts. All patients on track!
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 transition-colors group ${severityBg[alert.severity] || ""} ${
                      !alert.isRead
                        ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {alert.title}
                          </h4>
                          {alert.patient && (
                            <span
                              className="px-1.5 py-0.5 text-[10px] font-semibold rounded text-white shrink-0"
                              style={{ backgroundColor: alert.patient.avatarColor }}
                            >
                              {alert.patient.name.split(" ")[0]}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {alert.message}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-slate-400">
                            {new Date(alert.createdAt).toLocaleString([], {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Send Email Button */}
                            <button
                              onClick={() => sendEmail(alert.id)}
                              disabled={sendingEmailId === alert.id}
                              title="Re-send as email"
                              className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-0.5 transition-colors"
                            >
                              {sendingEmailId === alert.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : emailSentId === alert.id ? (
                                <CheckCheck className="w-3 h-3 text-violet-500" />
                              ) : (
                                <Mail className="w-3 h-3" />
                              )}
                              {emailSentId === alert.id ? "Sent!" : "Email"}
                            </button>
                            {!alert.isRead && (
                              <button
                                onClick={() => markOneRead(alert.id)}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5"
                                title="Mark as read"
                              >
                                <CheckCheck className="w-3 h-3" /> Read
                              </button>
                            )}
                            <button
                              onClick={() => deleteAlert(alert.id)}
                              disabled={deletingId === alert.id}
                              className="text-slate-300 hover:text-rose-600 transition-colors"
                              title="Delete alert"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">
                {alerts.length > 0 ? `${alerts.filter(a => a.isRead).length}/${alerts.length} reviewed` : "No alerts"}
              </span>
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Settings2 className="w-3 h-3" /> Notification Settings
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
