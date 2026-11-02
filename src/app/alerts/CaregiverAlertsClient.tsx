"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Filter,
  Heart,
  Pill,
  Calendar,
  X,
  Trash2,
  Check,
  Search,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, EmptyState, SkeletonTable } from "@/components/shared";
import { usePatientContext } from "@/context/PatientContext";

interface AlertItem {
  id: string;
  type: "MISSED_MED" | "REFILL_DUE" | "VITALS_WARNING" | "UPCOMING_APPOINTMENT" | string;
  title: string;
  message: string;
  severity: "danger" | "warning" | "info" | string;
  isRead: boolean;
  createdAt: string;
  patient?: {
    id: string;
    name: string;
    avatarColor: string;
  } | null;
}

export default function CaregiverAlertsClient() {
  const { patients } = usePatientContext();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedPatientId, setSelectedPatientId] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Resolve with Note Modal
  const [resolvingAlert, setResolvingAlert] = useState<AlertItem | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [submittingResolve, setSubmittingResolve] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedPatientId !== "all") params.append("patientId", selectedPatientId);
      if (selectedSeverity !== "all") params.append("severity", selectedSeverity);
      if (selectedType !== "all") params.append("type", selectedType);
      if (unreadOnly) params.append("unreadOnly", "true");

      const res = await fetch(`/api/alerts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPatientId, selectedSeverity, selectedType, unreadOnly]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleResolveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert) return;
    setSubmittingResolve(true);
    try {
      const res = await fetch(`/api/alerts/${resolvingAlert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true, note: resolveNote.trim() || undefined }),
      });
      if (res.ok) {
        setResolvingAlert(null);
        setResolveNote("");
        await fetchAlerts();
      }
    } catch (err) {
      console.error("Resolve error:", err);
    } finally {
      setSubmittingResolve(false);
    }
  };

  const handleQuickResolve = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
        );
      }
    } catch (err) {
      console.error("Quick resolve error:", err);
    }
  };

  const handleDelete = async (alertId: string) => {
    if (!confirm("Dismiss and delete this alert permanently?")) return;
    try {
      const res = await fetch(`/api/alerts/${alertId}`, { method: "DELETE" });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
    } catch (err) {
      console.error("Delete alert error:", err);
    }
  };

  const handleResolveAll = async () => {
    if (!confirm("Mark all active alerts as resolved?")) return;
    try {
      const res = await fetch("/api/alerts", { method: "PATCH" });
      if (res.ok) {
        await fetchAlerts();
      }
    } catch (err) {
      console.error("Resolve all error:", err);
    }
  };

  // KPI counts
  const totalUnresolved = alerts.filter((a) => !a.isRead).length;
  const criticalCount = alerts.filter((a) => !a.isRead && a.severity === "danger").length;
  const missedMedCount = alerts.filter((a) => !a.isRead && a.type === "MISSED_MED").length;
  const refillCount = alerts.filter((a) => !a.isRead && a.type === "REFILL_DUE").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Clinical Alerts & Triage"
        description="Real-time clinical notifications regarding missed doses, low medication inventory, and vital sign thresholds."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchAlerts();
              }}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Refresh alerts"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            {totalUnresolved > 0 && (
              <button
                onClick={handleResolveAll}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark All Resolved</span>
              </button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Active Alerts"
          value={totalUnresolved}
          subtext="Requires attention"
          variant="indigo"
          icon={Bell}
        />
        <StatCard
          label="Critical / Danger"
          value={criticalCount}
          subtext="Abnormal vitals or high risk"
          variant="rose"
          icon={AlertCircle}
        />
        <StatCard
          label="Missed Doses"
          value={missedMedCount}
          subtext="Unscheduled gap"
          variant="amber"
          icon={Pill}
        />
        <StatCard
          label="Refills Needed"
          value={refillCount}
          subtext="Low supply warning"
          variant="teal"
          icon={AlertTriangle}
        />
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Patient Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Patient:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Patients</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Severities</option>
              <option value="danger">Critical (Danger)</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* Type Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Types</option>
              <option value="MISSED_MED">Missed Medication</option>
              <option value="REFILL_DUE">Refill Needed</option>
              <option value="VITALS_WARNING">Abnormal Vitals</option>
              <option value="UPCOMING_APPOINTMENT">Upcoming Appointment</option>
            </select>
          </div>
        </div>

        {/* Unread toggle */}
        <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300 select-none">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
          />
          <span>Show Unresolved Only</span>
        </label>
      </div>

      {/* Alerts Feed */}
      {loading ? (
        <SkeletonTable cols={3} />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="All clear — No active alerts"
          description="There are currently no clinical alerts requiring attention based on your active filters."
          action={{
            label: "Clear Filters",
            onClick: () => {
              setSelectedPatientId("all");
              setSelectedSeverity("all");
              setSelectedType("all");
              setUnreadOnly(false);
            },
          }}
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const isDanger = alert.severity === "danger";
            const isWarning = alert.severity === "warning";

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border transition-all ${
                  alert.isRead
                    ? "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-75"
                    : isDanger
                    ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 shadow-xs"
                    : isWarning
                    ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 shadow-xs"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    {/* Icon based on alert type */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isDanger
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
                          : isWarning
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                          : "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      }`}
                    >
                      {alert.type === "MISSED_MED" ? (
                        <Pill className="w-5 h-5" />
                      ) : alert.type === "VITALS_WARNING" ? (
                        <Heart className="w-5 h-5" />
                      ) : alert.type === "REFILL_DUE" ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : alert.type === "UPCOMING_APPOINTMENT" ? (
                        <Calendar className="w-5 h-5" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {alert.patient && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-black text-white shrink-0"
                            style={{ backgroundColor: alert.patient.avatarColor || "#0D9488" }}
                          >
                            {alert.patient.name}
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                            isDanger
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              : isWarning
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                        >
                          {alert.severity}
                        </span>

                        {alert.isRead ? (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Resolved
                          </span>
                        ) : (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 animate-pulse">
                            Action Required
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {alert.title}
                      </h4>

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {alert.message}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(alert.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {alert.patient && (
                          <>
                            <span>•</span>
                            <Link
                              href={`/patients/${alert.patient.id}`}
                              className="font-medium text-teal-600 hover:underline"
                            >
                              Open Patient Chart
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {!alert.isRead ? (
                      <>
                        <button
                          onClick={() => handleQuickResolve(alert.id)}
                          className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 font-bold text-xs flex items-center gap-1 transition-colors"
                          title="Quickly mark as resolved"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Resolve</span>
                        </button>

                        <button
                          onClick={() => {
                            setResolvingAlert(alert);
                            setResolveNote("");
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors"
                          title="Acknowledge with clinical note"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>With Note</span>
                        </button>
                      </>
                    ) : null}

                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Dismiss alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve With Note Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Resolve Alert with Note
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{resolvingAlert.title}</p>
              </div>
              <button
                onClick={() => setResolvingAlert(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSingle} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Resolution Note / Action Taken
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="e.g. Spoke with pharmacy, refill order placed for pickup tomorrow morning."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolve}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {submittingResolve ? "Saving..." : "Confirm & Resolve"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
