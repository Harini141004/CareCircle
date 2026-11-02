"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  X,
  ExternalLink,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  SkeletonList,
  ConfirmDialog,
} from "@/components/shared";

interface AlertItem {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  createdAt: string;
  isEscalated: boolean;
  patient: {
    id: string;
    name: string;
  } | null;
}

interface CaregiverGroup {
  caregiver: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  alerts: AlertItem[];
}

export default function AlertsClient({ adminName: _adminName }: { adminName: string }) {
  const [groups, setGroups] = useState<CaregiverGroup[]>([]);
  const [escalationHours, setEscalationHours] = useState(24);
  const [totalUnresolved, setTotalUnresolved] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    alertId: string;
    action: "ESCALATE" | "RESOLVE";
    title: string;
  }>({
    open: false,
    alertId: "",
    action: "ESCALATE",
    title: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/alerts");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        setEscalationHours(data.escalationHours || 24);
        setTotalUnresolved(data.totalUnresolved || 0);
      }
    } catch (err) {
      console.error("Failed to fetch admin alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleActionConfirm = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: confirmModal.alertId,
          action: confirmModal.action,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({
          type: "success",
          text: data.message || "Alert updated successfully.",
        });
        setConfirmModal({ open: false, alertId: "", action: "ESCALATE", title: "" });
        await fetchAlerts();
      } else {
        setActionMessage({
          type: "error",
          text: data.error || "Failed to update alert.",
        });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts Oversight"
        description="Monitor unresolved alerts grouped by caregiver. High-age alerts exceeding the system escalation threshold are highlighted for follow-up."
        badge="Supervision"
        actions={
          <button
            onClick={fetchAlerts}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-xs font-semibold shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Action Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
            actionMessage.type === "success"
              ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              Total Unresolved
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {totalUnresolved}
            </div>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-800 pl-6">
            <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              Active Caregiver Groups
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {groups.length}
            </div>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-800 pl-6">
            <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              Escalation SLA
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {escalationHours}h
            </div>
          </div>
        </div>

        <Link
          href="/admin/settings"
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <span>Adjust escalation hours in Settings</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Grouped Alert List */}
      {loading ? (
        <SkeletonList count={3} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All Alerts Resolved"
          description="There are currently zero open alerts across all caregivers in the system."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div
              key={group.caregiver.id}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
            >
              {/* Group Header */}
              <div className="p-4 bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center">
                    {group.caregiver.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Caregiver: {group.caregiver.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {group.caregiver.email} {group.caregiver.phone ? `• ${group.caregiver.phone}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold">
                    {group.alerts.length} open {group.alerts.length === 1 ? "alert" : "alerts"}
                  </span>
                </div>
              </div>

              {/* Alerts in this group */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {group.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={alert.severity} />
                        {alert.isEscalated && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-bold text-[10px] border border-rose-200 dark:border-rose-800 animate-pulse">
                            <Flame className="w-3 h-3 text-rose-500" />
                            Overdue (&gt;{escalationHours}h)
                          </span>
                        )}
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {alert.title}
                        </span>
                      </div>

                      <p className="text-slate-600 dark:text-slate-400 text-xs line-clamp-1">
                        {alert.message}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                          }).format(new Date(alert.createdAt))}
                        </span>

                        {alert.patient && (
                          <Link
                            href="/admin/patients"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                          >
                            <span>Patient: {alert.patient.name}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!alert.title.startsWith("[ESCALATED]") && (
                        <button
                          onClick={() =>
                            setConfirmModal({
                              open: true,
                              alertId: alert.id,
                              action: "ESCALATE",
                              title: `Escalate alert "${alert.title}"`,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 font-semibold text-xs transition-colors flex items-center gap-1.5"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span>Mark Escalated</span>
                        </button>
                      )}

                      <button
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            alertId: alert.id,
                            action: "RESOLVE",
                            title: `Mark alert "${alert.title}" as resolved`,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80 hover:bg-teal-100 font-semibold text-xs transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Resolve</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmModal.open}
        onCancel={() => setConfirmModal({ ...confirmModal, open: false })}
        onConfirm={handleActionConfirm}
        title={confirmModal.title}
        description={
          confirmModal.action === "ESCALATE"
            ? "Escalating this alert will mark it as priority Danger, prepend [ESCALATED], and record an administrative audit entry."
            : "Marking this alert resolved will remove it from caregiver and administrative queues."
        }
        confirmLabel={confirmModal.action === "ESCALATE" ? "Confirm Escalation" : "Confirm Resolve"}
        loading={submitting}
      />
    </div>
  );
}
