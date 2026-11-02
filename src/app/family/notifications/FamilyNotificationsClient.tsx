"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  AlertTriangle,
  AlertCircle,
  Bell,
  Pill,
  Activity,
  Calendar,
  Clock,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface AlertItem {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  isRead: boolean;
  createdAt: string | Date;
}

interface FamilyNotificationsClientProps {
  patient: {
    id: string;
    name: string;
    caregiver?: { id: string; name: string; phone?: string | null } | null;
  };
  alerts: AlertItem[];
}

export default function FamilyNotificationsClient({
  patient,
  alerts,
}: FamilyNotificationsClientProps) {
  const [filterType, setFilterType] = useState<string>("ALL");

  const vitalsAlerts = alerts.filter((a) => a.type === "VITALS_WARNING");
  const missedMedAlerts = alerts.filter((a) => a.type === "MISSED_MED");
  const refillAlerts = alerts.filter((a) => a.type === "REFILL_DUE");
  const highSeverityAlerts = alerts.filter((a) => a.severity === "danger");

  const filteredAlerts = alerts.filter((a) => {
    if (filterType === "ALL") return true;
    return a.type === filterType;
  });

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "VITALS_WARNING":
        return <Activity className="w-4 h-4 text-rose-500" />;
      case "MISSED_MED":
        return <Pill className="w-4 h-4 text-amber-500" />;
      case "REFILL_DUE":
        return <RefreshCw className="w-4 h-4 text-indigo-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Notifications for ${patient.name}`}
        description="Stay updated with vital sign observations, medication adherence notices, and refill progress."
      />

      {/* Summary StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Notifications"
          value={alerts.length}
          subtext="Care updates recorded"
          icon={Bell}
          variant="indigo"
        />
        <StatCard
          label="Abnormal Vitals"
          value={vitalsAlerts.length}
          subtext="Clinical warning threshold"
          icon={Activity}
          variant="rose"
        />
        <StatCard
          label="Refill Alerts"
          value={refillAlerts.length}
          subtext="Supply coordination"
          icon={RefreshCw}
          variant="violet"
        />
        <StatCard
          label="Care Coordinator"
          value={patient.caregiver?.name || "Assigned"}
          subtext={patient.caregiver?.phone ? `Direct: ${patient.caregiver.phone}` : "Monitors alerts"}
          icon={ShieldCheck}
          variant="emerald"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterType("ALL")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterType === "ALL"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          All Notifications ({alerts.length})
        </button>
        <button
          onClick={() => setFilterType("VITALS_WARNING")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterType === "VITALS_WARNING"
              ? "bg-rose-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          Vitals Warnings ({vitalsAlerts.length})
        </button>
        <button
          onClick={() => setFilterType("MISSED_MED")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterType === "MISSED_MED"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          Missed Doses ({missedMedAlerts.length})
        </button>
        <button
          onClick={() => setFilterType("REFILL_DUE")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterType === "REFILL_DUE"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          Refills ({refillAlerts.length})
        </button>
      </div>

      {/* Alerts Feed */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          title="No Notifications in this Category"
          description="Everything is currently on schedule. There are no active clinical alerts for your loved one."
          icon={ShieldCheck}
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const dt = new Date(alert.createdAt);
            const dateStr = dt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const timeStr = dt.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <div
                key={alert.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {alert.title}
                      </h3>
                      <div
                        className="flex items-center gap-2 text-[11px] text-slate-400"
                        suppressHydrationWarning
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{dateStr} at {timeStr}</span>
                      </div>
                    </div>
                  </div>

                  <StatusBadge
                    status={alert.severity === "danger" ? "danger" : alert.severity === "warning" ? "warning" : "info"}
                    label={alert.severity.toUpperCase()}
                  />
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                  {alert.message}
                </p>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Type: {alert.type}</span>
                  <span className="italic">Read-only notification • Triage handled by clinical staff</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
