"use client";

import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Activity, Heart, Droplets, Thermometer, Scale, Clock, ShieldCheck } from "lucide-react";

interface SymptomLog {
  id: string;
  timestamp: string | Date;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  bloodSugar?: number | null;
  heartRate?: number | null;
  weight?: number | null;
  temperature?: number | null;
  mood?: string | null;
  symptomSeverity?: number | null;
  notes?: string | null;
}

interface FamilyVitalsClientProps {
  patient: {
    id: string;
    name: string;
    caregiver?: { id: string; name: string; phone?: string | null } | null;
  };
  logs: SymptomLog[];
}

export default function FamilyVitalsClient({ patient, logs }: FamilyVitalsClientProps) {
  const latest = logs[0] || null;

  const getSeverityBadge = (severity?: number | null) => {
    if (severity === undefined || severity === null || severity === 0) {
      return <StatusBadge status="success" label="0 • Normal / None" />;
    }
    if (severity <= 3) {
      return <StatusBadge status="info" label={`${severity}/10 • Mild`} />;
    }
    if (severity <= 6) {
      return <StatusBadge status="warning" label={`${severity}/10 • Moderate`} />;
    }
    return <StatusBadge status="danger" label={`${severity}/10 • Severe`} />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Vitals & Symptoms for ${patient.name}`}
        description="View-only health recordings and clinical observations entered by the care team."
      />

      {/* Latest Vitals StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Blood Pressure"
          value={
            latest?.bloodPressureSystolic !== undefined &&
            latest?.bloodPressureSystolic !== null &&
            latest?.bloodPressureDiastolic !== undefined &&
            latest?.bloodPressureDiastolic !== null
              ? `${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic} mmHg`
              : "—"
          }
          subtext={
            latest
              ? `Recorded ${new Date(latest.timestamp).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}`
              : "No readings"
          }
          icon={Heart}
          variant="rose"
        />
        <StatCard
          label="Heart Rate"
          value={
            latest?.heartRate !== undefined && latest?.heartRate !== null
              ? `${latest.heartRate} bpm`
              : "—"
          }
          subtext="Resting pulse"
          icon={Activity}
          variant="indigo"
        />
        <StatCard
          label="Blood Sugar"
          value={
            latest?.bloodSugar !== undefined && latest?.bloodSugar !== null
              ? `${latest.bloodSugar} mg/dL`
              : "—"
          }
          subtext="Glucose level"
          icon={Droplets}
          variant="violet"
        />
        <StatCard
          label="Temperature"
          value={
            latest?.temperature !== undefined && latest?.temperature !== null
              ? `${latest.temperature} °F`
              : "—"
          }
          subtext={latest?.weight ? `Weight: ${latest.weight} lbs` : "Body temperature"}
          icon={Thermometer}
          variant="emerald"
        />
      </div>

      {/* Vitals History Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Recorded Vitals & Symptoms History ({logs.length})
          </h2>
          <span className="text-xs text-slate-500">Read-only view • Family access</span>
        </div>

        {logs.length === 0 ? (
          <EmptyState
            title="No Vitals Recorded"
            description="The primary caregiver has not yet logged vitals readings for this patient."
            icon={Activity}
          />
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const dt = new Date(log.timestamp);
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
                  key={log.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100" suppressHydrationWarning>
                          {dateStr} at {timeStr}
                        </div>
                        {log.mood && (
                          <div className="text-[11px] text-slate-500">
                            Observed Mood: <span className="font-semibold text-slate-700 dark:text-slate-300">{log.mood}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>{getSeverityBadge(log.symptomSeverity)}</div>
                  </div>

                  {/* Vitals Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Pressure</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {log.bloodPressureSystolic !== null && log.bloodPressureSystolic !== undefined
                          ? `${log.bloodPressureSystolic}/${log.bloodPressureDiastolic} mmHg`
                          : "—"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Heart Rate</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {log.heartRate !== null && log.heartRate !== undefined ? `${log.heartRate} bpm` : "—"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Sugar</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {log.bloodSugar !== null && log.bloodSugar !== undefined ? `${log.bloodSugar} mg/dL` : "—"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Temperature</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {log.temperature !== null && log.temperature !== undefined ? `${log.temperature} °F` : "—"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 col-span-2 sm:col-span-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Weight</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {log.weight !== null && log.weight !== undefined ? `${log.weight} lbs` : "—"}
                      </span>
                    </div>
                  </div>

                  {log.notes && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-500 mr-1.5">Caregiver Note:</span>
                      {log.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
