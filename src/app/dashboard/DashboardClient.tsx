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
  Plus,
  XCircle,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Sun,
  Sunset,
  Moon,
  Sunrise,
  Check,
  X,
} from "lucide-react";

interface DoseItem {
  id: string;
  medicationId: string;
  patientId: string;
  scheduledFor: string;
  status: "PENDING" | "TAKEN" | "TAKEN_LATE" | "MISSED" | "REFUSED" | "SKIPPED";
  takenAt?: string | null;
  reason?: string | null;
  note?: string | null;
  loggedAt?: string | null;
  loggedByType?: string | null;
  loggedById?: string | null;
  editedAt?: string | null;
  medication: {
    id: string;
    name: string;
    dosage: string;
    instructions?: string | null;
    remainingQuantity: number;
    refillThreshold: number;
  };
  patient: {
    id: string;
    name: string;
    avatarColor: string;
  };
}

interface DoseSettings {
  overdueDoseMinutes: number;
  autoMissMinutes: number;
  doseEditMinutes: number;
  countRefusedInAdherence: boolean;
}

interface DashboardData {
  totalMedications: number;
  overallAdherenceRate: number;
  activeAlertsCount: number;
  upcomingAppointmentsCount: number;
  doses: DoseItem[];
  settings: DoseSettings;
}

export default function DashboardClient() {
  const { patients, activePatientId, setActivePatientId } = usePatientContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");

  // Modal State for Reason & Corrections
  const [activeModalDose, setActiveModalDose] = useState<DoseItem | null>(null);
  const [modalAction, setModalAction] = useState<
    "TAKEN_LATE" | "MISSED" | "REFUSED" | "SKIPPED" | "CORRECT" | null
  >(null);
  const [modalReason, setModalReason] = useState("");
  const [modalNote, setModalNote] = useState("");
  const [modalTargetStatus, setModalTargetStatus] = useState<
    "TAKEN" | "TAKEN_LATE" | "MISSED" | "REFUSED" | "SKIPPED"
  >("TAKEN");
  const [submittingDose, setSubmittingDose] = useState(false);
  const [modalError, setModalError] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const [alertsRes, medsRes, apptsRes, dosesRes] = await Promise.all([
        fetch("/api/alerts"),
        fetch(`/api/medications?patientId=${activePatientId}`),
        fetch(`/api/appointments?patientId=${activePatientId}`),
        fetch(`/api/doses?patientId=${activePatientId}`),
      ]);

      const alertsData = alertsRes.ok ? await alertsRes.json() : { unreadCount: 0 };
      const medsData = medsRes.ok ? await medsRes.json() : { medications: [] };
      const apptsData = apptsRes.ok ? await apptsRes.json() : { appointments: [] };
      const dosesData = dosesRes.ok
        ? await dosesRes.json()
        : { doses: [], adherence: { adherenceRate: 100 }, settings: { overdueDoseMinutes: 60, autoMissMinutes: 120, doseEditMinutes: 30, countRefusedInAdherence: false } };

      const upcomingAppts = (apptsData.appointments || []).filter(
        (a: any) => a.status === "UPCOMING"
      ).length;

      setData({
        totalMedications: (medsData.medications || []).filter((m: any) => m.isActive).length,
        overallAdherenceRate: dosesData.adherence?.adherenceRate ?? 100,
        activeAlertsCount: alertsData.unreadCount || 0,
        upcomingAppointmentsCount: upcomingAppts,
        doses: dosesData.doses || [],
        settings: dosesData.settings || {
          overdueDoseMinutes: 60,
          autoMissMinutes: 120,
          doseEditMinutes: 30,
          countRefusedInAdherence: false,
        },
      });
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, [activePatientId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // 1-Tap Taken Action
  const handleOneTapTaken = async (dose: DoseItem) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/doses/${dose.id}/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "TAKEN",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to mark dose as taken");
      }

      showToast(`✓ Marked ${dose.medication.name} as TAKEN for ${dose.patient.name}`);
      await loadDashboard();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Open Reason Modal
  const openActionModal = (
    dose: DoseItem,
    action: "TAKEN_LATE" | "MISSED" | "REFUSED" | "SKIPPED"
  ) => {
    setActiveModalDose(dose);
    setModalAction(action);
    setModalTargetStatus(action);
    setModalReason("");
    setModalNote("");
    setModalError("");
  };

  // Open Correction / Undo Modal (within 30m window)
  const openCorrectionModal = (dose: DoseItem) => {
    setActiveModalDose(dose);
    setModalAction("CORRECT");
    setModalTargetStatus(dose.status === "PENDING" ? "TAKEN" : (dose.status as any));
    setModalReason(dose.reason || "");
    setModalNote(dose.note || "");
    setModalError("");
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalDose || !modalAction) return;

    if (
      (modalTargetStatus === "REFUSED" || modalTargetStatus === "SKIPPED") &&
      !modalReason.trim()
    ) {
      setModalError(`A clinical reason is required when a dose is ${modalTargetStatus}.`);
      return;
    }

    if (modalTargetStatus === "MISSED" && !modalReason.trim() && !modalNote.trim()) {
      setModalError("Please provide either a reason or clinical note for missed doses.");
      return;
    }

    setSubmittingDose(true);
    setModalError("");

    try {
      if (modalAction === "CORRECT") {
        // Use PATCH endpoint
        const res = await fetch(`/api/doses/${activeModalDose.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: modalTargetStatus,
            reason: modalReason.trim() || undefined,
            note: modalNote.trim() || undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to correct dose log");
        }

        showToast(`✓ Dose corrected to ${modalTargetStatus}`);
      } else {
        // Use POST mark endpoint
        const res = await fetch(`/api/doses/${activeModalDose.id}/mark`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: modalTargetStatus,
            reason: modalReason.trim() || undefined,
            note: modalNote.trim() || undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to mark dose");
        }

        showToast(`✓ Dose marked as ${modalTargetStatus}`);
      }

      setActiveModalDose(null);
      setModalAction(null);
      await loadDashboard();
    } catch (err: any) {
      setModalError(err.message || "Failed to submit dose update");
    } finally {
      setSubmittingDose(false);
    }
  };

  // Helper to determine overdue status
  const isDoseOverdue = (dose: DoseItem) => {
    if (dose.status !== "PENDING") return false;
    const now = new Date().getTime();
    const scheduled = new Date(dose.scheduledFor).getTime();
    const thresholdMinutes = data?.settings?.overdueDoseMinutes || 60;
    return now > scheduled + thresholdMinutes * 60 * 1000;
  };

  // Helper to check 30 min correction window
  const canUndoOrCorrect = (dose: DoseItem) => {
    if (!dose.loggedAt || dose.status === "PENDING") return false;
    const now = new Date().getTime();
    const logged = new Date(dose.loggedAt).getTime();
    const editWindowMinutes = data?.settings?.doseEditMinutes || 30;
    return now - logged <= editWindowMinutes * 60 * 1000;
  };

  // Helper for remaining edit minutes
  const remainingEditMinutes = (dose: DoseItem) => {
    if (!dose.loggedAt) return 0;
    const now = new Date().getTime();
    const logged = new Date(dose.loggedAt).getTime();
    const editWindowMinutes = data?.settings?.doseEditMinutes || 30;
    const remaining = Math.max(0, editWindowMinutes - Math.floor((now - logged) / 60000));
    return remaining;
  };

  // Time slot classifier
  const getTimeSlot = (scheduledForStr: string) => {
    const d = new Date(scheduledForStr);
    const hour = d.getHours();
    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 21) return "Evening";
    return "Night";
  };

  const formatDoseTime = (scheduledForStr: string) => {
    const d = new Date(scheduledForStr);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Doses categorization
  const allDoses = data?.doses || [];
  const overdueDoses = allDoses.filter(isDoseOverdue);
  const regularDoses = allDoses;

  const slots = [
    { name: "Morning", icon: Sunrise, period: "5:00 AM – 11:59 AM" },
    { name: "Afternoon", icon: Sun, period: "12:00 PM – 4:59 PM" },
    { name: "Evening", icon: Sunset, period: "5:00 PM – 8:59 PM" },
    { name: "Night", icon: Moon, period: "9:00 PM – 4:59 AM" },
  ];

  const adherenceColor =
    (data?.overallAdherenceRate ?? 100) >= 90
      ? "text-emerald-600 dark:text-emerald-400"
      : (data?.overallAdherenceRate ?? 100) >= 70
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Today&apos;s Clinical Care Board
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time dose checklist, administration logs, and clinical oversight.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDashboard()}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Refresh Schedule</span>
          </button>
        </div>
      </div>

      {/* Dependents Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Dependents Under Your Care ({patients.length})
          </h2>
          <Link
            href="/patients"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
          >
            Manage Profiles <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Consolidated View */}
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
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Consolidated View
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  All {patients.length} Dependents Combined
                </div>
              </div>
            </div>
          </button>

          {/* Individual Patient Cards */}
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
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {p.name}
                  </div>
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

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {loading ? "—" : (data?.totalMedications ?? 0)}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Active Prescriptions
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className={`text-2xl font-extrabold ${loading ? "text-slate-400" : adherenceColor}`}>
              {loading ? "—" : `${data?.overallAdherenceRate ?? 100}%`}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Today&apos;s Adherence Rate
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div
              className={`text-2xl font-extrabold ${
                (data?.activeAlertsCount ?? 0) > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {loading ? "—" : (data?.activeAlertsCount ?? 0)}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Unread Alerts
            </div>
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
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Upcoming Visits
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Dose Checklist & Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue Doses Section (Highlighted at Top) */}
          {overdueDoses.length > 0 && (
            <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 animate-bounce" />
                  <h3 className="font-extrabold text-base">
                    ⚠️ Overdue Doses Requiring Action ({overdueDoses.length})
                  </h3>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                  Past {data?.settings?.overdueDoseMinutes || 60}m Late Window
                </span>
              </div>

              <div className="space-y-3">
                {overdueDoses.map((dose) => (
                  <div
                    key={dose.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center shrink-0 text-xs shadow"
                          style={{ backgroundColor: dose.patient.avatarColor }}
                        >
                          {dose.patient.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {dose.medication.name} <span className="font-normal text-slate-500">({dose.medication.dosage})</span>
                          </div>
                          <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2 mt-0.5">
                            <span>Scheduled: {formatDoseTime(dose.scheduledFor)}</span>
                            <span>•</span>
                            <span>{dose.patient.name}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 self-start sm:self-auto">
                        Overdue
                      </span>
                    </div>

                    {/* Touch Buttons for Overdue */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleOneTapTaken(dose)}
                        className="min-h-[44px] py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95"
                      >
                        <Check className="w-4 h-4" /> Taken
                      </button>
                      <button
                        onClick={() => openActionModal(dose, "TAKEN_LATE")}
                        className="min-h-[44px] py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95"
                      >
                        <Clock className="w-4 h-4" /> Taken Late
                      </button>
                      <button
                        onClick={() => openActionModal(dose, "MISSED")}
                        className="min-h-[44px] py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95"
                      >
                        <XCircle className="w-4 h-4" /> Missed
                      </button>
                      <button
                        onClick={() => openActionModal(dose, "REFUSED")}
                        className="min-h-[44px] py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95"
                      >
                        <HelpCircle className="w-4 h-4" /> Refused
                      </button>
                      <button
                        onClick={() => openActionModal(dose, "SKIPPED")}
                        className="min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95 col-span-2 sm:col-span-1"
                      >
                        <X className="w-4 h-4" /> Skipped
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Dose Checklist Grouped by Time Slot */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Today&apos;s Medication Schedule by Time Slot
                </h3>
              </div>
              <Link
                href="/medications"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Medications Hub →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : regularDoses.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Pill className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm">
                  No doses scheduled for today.<br />
                  <Link href="/medications" className="text-indigo-600 font-bold hover:underline">
                    Add prescriptions →
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {slots.map((slot) => {
                  const SlotIcon = slot.icon;
                  const slotDoses = regularDoses.filter(
                    (d) => getTimeSlot(d.scheduledFor) === slot.name
                  );

                  if (slotDoses.length === 0) return null;

                  return (
                    <div key={slot.name} className="space-y-3">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <SlotIcon className="w-4 h-4" />
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                          {slot.name}
                        </h4>
                        <span className="text-xs text-slate-400">({slot.period})</span>
                        <span className="ml-auto text-xs font-bold text-slate-500">
                          {slotDoses.filter((d) => d.status === "TAKEN" || d.status === "TAKEN_LATE").length} / {slotDoses.length} completed
                        </span>
                      </div>

                      <div className="space-y-3">
                        {slotDoses.map((dose) => {
                          const overdue = isDoseOverdue(dose);
                          const editable = canUndoOrCorrect(dose);

                          return (
                            <div
                              key={dose.id}
                              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                                overdue
                                  ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800"
                                  : dose.status === "TAKEN" || dose.status === "TAKEN_LATE"
                                  ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/60"
                                  : dose.status === "MISSED"
                                  ? "bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40"
                                  : dose.status === "REFUSED"
                                  ? "bg-purple-50/30 dark:bg-purple-950/10 border-purple-200 dark:border-purple-900/40"
                                  : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 shadow-sm"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="px-3 py-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-xs font-black shrink-0 text-center">
                                    {formatDoseTime(dose.scheduledFor)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                      {dose.medication.name}{" "}
                                      <span className="font-normal text-slate-500">
                                        ({dose.medication.dosage})
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: dose.patient.avatarColor }}
                                      />
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        {dose.patient.name}
                                      </span>
                                      {dose.medication.remainingQuantity <= dose.medication.refillThreshold && (
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                                          Stock: {dose.medication.remainingQuantity}
                                        </span>
                                      )}
                                    </div>
                                    {(dose.reason || dose.note) && (
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                                        {dose.reason ? `Reason: "${dose.reason}"` : `Note: "${dose.note}"`}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Status & Undo */}
                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                  {dose.status !== "PENDING" && (
                                    <span
                                      className={`px-3 py-1 text-xs font-extrabold rounded-xl ${
                                        dose.status === "TAKEN"
                                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                          : dose.status === "TAKEN_LATE"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                          : dose.status === "MISSED"
                                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                          : dose.status === "REFUSED"
                                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                          : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                      }`}
                                    >
                                      {dose.status === "TAKEN"
                                        ? "Taken"
                                        : dose.status === "TAKEN_LATE"
                                        ? "Taken Late"
                                        : dose.status === "MISSED"
                                        ? "Missed"
                                        : dose.status === "REFUSED"
                                        ? "Refused"
                                        : "Skipped"}
                                    </span>
                                  )}

                                  {editable && (
                                    <button
                                      onClick={() => openCorrectionModal(dose)}
                                      className="min-h-[36px] px-3 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                      title="Undo or correct this record within 30 minutes of marking"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                      <span>Undo ({remainingEditMinutes(dose)}m)</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Large Buttons for PENDING doses */}
                              {dose.status === "PENDING" && (
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                  <button
                                    onClick={() => handleOneTapTaken(dose)}
                                    className="min-h-[44px] py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95"
                                  >
                                    <Check className="w-4 h-4" /> Taken
                                  </button>
                                  <button
                                    onClick={() => openActionModal(dose, "TAKEN_LATE")}
                                    className="min-h-[44px] py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95"
                                  >
                                    <Clock className="w-4 h-4" /> Taken Late
                                  </button>
                                  <button
                                    onClick={() => openActionModal(dose, "MISSED")}
                                    className="min-h-[44px] py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95"
                                  >
                                    <XCircle className="w-4 h-4" /> Missed
                                  </button>
                                  <button
                                    onClick={() => openActionModal(dose, "REFUSED")}
                                    className="min-h-[44px] py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95"
                                  >
                                    <HelpCircle className="w-4 h-4" /> Refused
                                  </button>
                                  <button
                                    onClick={() => openActionModal(dose, "SKIPPED")}
                                    className="min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95 col-span-2 sm:col-span-1"
                                  >
                                    <X className="w-4 h-4" /> Skipped
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Tools & Adherence Overview */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Caregiver Quick Tools
            </h3>
            <div className="space-y-2">
              <Link
                href="/medications"
                className="w-full p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-indigo-900 dark:text-indigo-200 font-semibold text-xs transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Pill className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Prescription Hub & Stock</span>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-600" />
              </Link>
              <Link
                href="/vitals"
                className="w-full p-3 rounded-2xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800 flex items-center justify-between text-violet-900 dark:text-violet-200 font-semibold text-xs transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <span>Record Vitals & Symptoms</span>
                </div>
                <ChevronRight className="w-4 h-4 text-violet-600" />
              </Link>
              <Link
                href="/appointments"
                className="w-full p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-blue-900 dark:text-blue-200 font-semibold text-xs transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Doctor Visit Checklists</span>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-600" />
              </Link>
              <Link
                href="/reports"
                className="w-full p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between text-purple-900 dark:text-purple-200 font-semibold text-xs transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Clinical Reports & Exports</span>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-600" />
              </Link>
            </div>
          </div>

          {/* Adherence Summary Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Caregiver Adherence Formula
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Adherence rate = <strong>(Taken + Taken Late) ÷ Expected Doses</strong>.
              Skipped doses are excluded. Patient refusals are tracked separately and not penalized against caregiver adherence by default.
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Compliance:</span>
              <span className={`font-black text-sm ${adherenceColor}`}>
                {data?.overallAdherenceRate ?? 100}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reason / Correction Modal */}
      {activeModalDose && modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {modalAction === "CORRECT" ? "Undo / Correct Dose Mark" : `Log Dose as ${modalAction}`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActiveModalDose(null);
                  setModalAction(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
              <div className="font-bold">
                {activeModalDose.medication.name} ({activeModalDose.medication.dosage})
              </div>
              <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                Patient: {activeModalDose.patient.name} • Scheduled: {formatDoseTime(activeModalDose.scheduledFor)}
              </div>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              {modalAction === "CORRECT" && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Corrected Status
                  </label>
                  <select
                    value={modalTargetStatus}
                    onChange={(e) => setModalTargetStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold"
                  >
                    <option value="TAKEN">Taken</option>
                    <option value="TAKEN_LATE">Taken Late</option>
                    <option value="MISSED">Missed</option>
                    <option value="REFUSED">Refused</option>
                    <option value="SKIPPED">Skipped</option>
                  </select>
                </div>
              )}

              {/* Quick Preset Buttons */}
              {modalTargetStatus === "REFUSED" && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Quick Reason Selection (or type below)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Patient refused - nausea", "Patient refused - felt unwell", "Patient felt sleepy", "Patient took earlier"].map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setModalReason(preset)}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-semibold transition-colors"
                        >
                          {preset}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {modalTargetStatus === "SKIPPED" && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Quick Preset Reasons
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Physician advised hold", "Fasting for blood tests", "Procedure scheduled"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setModalReason(preset)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Reason {(modalTargetStatus === "REFUSED" || modalTargetStatus === "SKIPPED") ? "(Required)" : "(Optional)"}
                </label>
                <input
                  type="text"
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder="e.g. Patient experienced stomach discomfort"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Clinical Observation / Note
                </label>
                <textarea
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  rows={2}
                  placeholder="Any additional notes for family or physician review"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModalDose(null);
                    setModalAction(null);
                  }}
                  disabled={submittingDose}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDose}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submittingDose ? "Saving..." : "Confirm & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
