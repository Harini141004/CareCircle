"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePatientContext } from "@/context/PatientContext";
import {
  Users,
  Pill,
  Activity,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Plus,
  XCircle,
} from "lucide-react";

interface ScheduleItem {
  id: string;
  medId: string;
  medicationName: string;
  dosage: string;
  time: string;
  patientName: string;
  patientAvatarColor: string;
  status: string;
}

interface DashboardData {
  totalMedications: number;
  overallAdherenceRate: number;
  activeAlertsCount: number;
  upcomingAppointmentsCount: number;
  todaySchedule: ScheduleItem[];
}

export default function DashboardPage() {
  const { patients, activePatientId, activePatient, setActivePatientId } = usePatientContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const [alertsRes, medsRes, apptsRes] = await Promise.all([
        fetch("/api/alerts"),
        fetch(`/api/medications?patientId=${activePatientId}`),
        fetch(`/api/appointments?patientId=${activePatientId}`),
      ]);

      const alertsData = alertsRes.ok ? await alertsRes.json() : { alerts: [], unreadCount: 0 };
      const medsData = medsRes.ok ? await medsRes.json() : { medications: [] };
      const apptsData = apptsRes.ok ? await apptsRes.json() : { appointments: [] };

      // Build today's schedule
      const schedule: ScheduleItem[] = [];
      medsData.medications.forEach((med: any) => {
        if (!med.isActive) return;
        let times = ["08:00"];
        try { times = JSON.parse(med.timesOfDay); } catch (e) {}
        times.forEach((t: string) => {
          // Get most recent log status (today's if exists)
          const todayLog = med.logs?.find((l: any) => {
            const d = new Date(l.scheduledFor);
            const today = new Date();
            return d.toDateString() === today.toDateString();
          });
          schedule.push({
            id: `${med.id}-${t}`,
            medId: med.id,
            medicationName: med.name,
            dosage: med.dosage,
            time: t,
            patientName: med.patient?.name || "Patient",
            patientAvatarColor: med.patient?.avatarColor || "#0D9488",
            status: todayLog?.status || "PENDING",
          });
        });
      });
      schedule.sort((a, b) => a.time.localeCompare(b.time));

      // Compute overall adherence from all meds logs
      let totalDoses = 0;
      let takenDoses = 0;
      medsData.medications.forEach((med: any) => {
        if (med.logs) {
          totalDoses += med.logs.length;
          takenDoses += med.logs.filter((l: any) => l.status === "TAKEN").length;
        }
      });
      const adherence = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

      const upcomingAppts = (apptsData.appointments || []).filter(
        (a: any) => a.status === "UPCOMING"
      ).length;

      setData({
        totalMedications: medsData.medications.filter((m: any) => m.isActive).length,
        overallAdherenceRate: adherence,
        activeAlertsCount: alertsData.unreadCount || 0,
        upcomingAppointmentsCount: upcomingAppts,
        todaySchedule: schedule.slice(0, 8),
      });
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, [activePatientId]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleQuickLog = async (medId: string, status: "TAKEN" | "MISSED") => {
    try {
      const res = await fetch(`/api/medications/${medId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showToast(status === "TAKEN" ? "✓ Dose marked as taken!" : "✗ Dose marked as missed.");
        await loadDashboard();
      }
    } catch (err) {
      console.error("Quick log error:", err);
    }
  };

  const adherenceColor =
    (data?.overallAdherenceRate ?? 100) >= 90
      ? "text-violet-600 dark:text-violet-400"
      : (data?.overallAdherenceRate ?? 100) >= 70
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl cc-dialog text-xs font-semibold shadow-2xl border animate-in slide-in-from-bottom-4 duration-300">
          {toastMsg}
        </div>
      )}

      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-50 via-violet-50 to-rose-50 border border-indigo-100 text-slate-900 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Caregiver Executive View
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {activePatient ? (
                <>Managing Care for <span style={{ color: activePatient.avatarColor }}>{activePatient.name}</span></>
              ) : (
                <>Consolidated Multi-Patient Dashboard</>
              )}
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl leading-relaxed">
              Real-time synchronization across {patients.length} dependent patient profile{patients.length !== 1 ? "s" : ""}. Medication adherence, vitals tracking, and pre-visit preparations in one unified hub.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadDashboard()}
              className="p-2.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-100 transition-colors shadow-sm"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              href="/reports"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs shadow-md flex items-center gap-2 transition-all"
            >
              <FileText className="w-4 h-4" />
              Generate Doctor PDF
            </Link>
          </div>
        </div>
      </div>

      {/* Dependents Quick Switch Bar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Dependents Under Your Care ({patients.length})
          </h2>
          <Link href="/patients" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
            Manage Profiles <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* All Patients card */}
          <button
            onClick={() => setActivePatientId("all")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activePatientId === "all"
                ? "bg-indigo-50/80 border-indigo-500/80 dark:bg-indigo-950/40 dark:border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center shadow-md">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">Consolidated View</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">All {patients.length} Dependents Combined</div>
              </div>
            </div>
          </button>

          {/* Per-Patient Cards */}
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePatientId(p.id)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activePatientId === p.id
                  ? "bg-indigo-50/80 border-indigo-500/80 dark:bg-indigo-950/40 dark:border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center shadow-md text-sm"
                  style={{ backgroundColor: p.avatarColor }}
                >
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{p.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>{p.relationship}</span>
                    <span>•</span>
                    <span className="truncate">{p.primaryCondition || "Healthy"}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}

          {patients.length === 0 && !loading && (
            <Link
              href="/patients"
              className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-600 transition-all text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add First Patient
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {loading ? "—" : (data?.totalMedications ?? 0)}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Prescriptions</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className={`text-2xl font-extrabold ${loading ? "text-slate-400" : adherenceColor}`}>
              {loading ? "—" : `${data?.overallAdherenceRate ?? 100}%`}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Med Adherence Rate</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className={`text-2xl font-extrabold ${(data?.activeAlertsCount ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}>
              {loading ? "—" : (data?.activeAlertsCount ?? 0)}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Unread Alerts</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {loading ? "—" : (data?.upcomingAppointmentsCount ?? 0)}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Upcoming Visits</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Medication Timeline */}
        <div className="lg:col-span-2">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Today&apos;s Medication Timeline
                </h3>
              </div>
              <Link href="/medications" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                Full Hub →
              </Link>
            </div>

            <div className="space-y-2.5">
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)
              ) : data?.todaySchedule && data.todaySchedule.length > 0 ? (
                data.todaySchedule.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-extrabold text-slate-800 dark:text-slate-200 shrink-0 min-w-[48px] text-center">
                        {item.time}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {item.medicationName} <span className="font-normal text-slate-500">({item.dosage})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.patientAvatarColor }} />
                          <span>{item.patientName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.status === "PENDING" ? (
                        <>
                          <button
                            onClick={() => handleQuickLog(item.medId, "TAKEN")}
                            className="px-2.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Take
                          </button>
                          <button
                            onClick={() => handleQuickLog(item.medId, "MISSED")}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-rose-100 dark:bg-slate-700 dark:hover:bg-rose-900/50 text-slate-600 dark:text-slate-300 hover:text-rose-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3 h-3" /> Miss
                          </button>
                        </>
                      ) : (
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-xl ${
                            item.status === "TAKEN"
                              ? "bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300"
                              : item.status === "MISSED"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-slate-400 text-sm space-y-2">
                  <Pill className="w-8 h-8 mx-auto opacity-30" />
                  <p>No medications scheduled.<br />
                    <Link href="/medications" className="text-indigo-600 font-semibold hover:underline">Add prescriptions →</Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Quick Actions + Adherence Breakdown */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-4">Caregiver Quick Tools</h3>
            <div className="space-y-2.5">
              <Link href="/medications" className="w-full p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-indigo-900 dark:text-indigo-200 font-semibold text-xs transition-colors">
                <div className="flex items-center gap-2.5">
                  <Pill className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Log Medication Dose</span>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </Link>
              <Link href="/vitals" className="w-full p-3 rounded-2xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800 flex items-center justify-between text-violet-900 dark:text-violet-200 font-semibold text-xs transition-colors">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <span>Record Vitals & Symptoms</span>
                </div>
                <ChevronRight className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </Link>
              <Link href="/appointments" className="w-full p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-blue-900 dark:text-blue-200 font-semibold text-xs transition-colors">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Doctor Visit Checklist</span>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </Link>
              <Link href="/reports" className="w-full p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between text-purple-900 dark:text-purple-200 font-semibold text-xs transition-colors">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Export Doctor PDF Report</span>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </Link>
            </div>
          </div>

          {/* Adherence Indicator */}
          {!loading && data && (
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">Adherence Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">Overall Adherence</span>
                  <span className={adherenceColor}>{data.overallAdherenceRate}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      data.overallAdherenceRate >= 90 ? "bg-violet-500"
                      : data.overallAdherenceRate >= 70 ? "bg-amber-500"
                      : "bg-rose-500"
                    }`}
                    style={{ width: `${data.overallAdherenceRate}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {data.overallAdherenceRate >= 90
                    ? "Excellent adherence — keep up the great work!"
                    : data.overallAdherenceRate >= 70
                    ? "Good adherence — a few missed doses this period."
                    : "Attention needed — many doses missed recently."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
