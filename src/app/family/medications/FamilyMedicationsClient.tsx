"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Pill,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  AlertCircle,
  HelpCircle,
  Calendar,
  XCircle,
  UserCheck,
} from "lucide-react";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timesOfDay: string;
  instructions?: string | null;
  prescribingDoctor?: string | null;
  remainingQuantity?: number | null;
  totalQuantity?: number | null;
  refillThreshold?: number | null;
}

interface DoseItem {
  id: string;
  medicationId: string;
  patientId: string;
  scheduledFor: string | Date;
  status: "PENDING" | "TAKEN" | "TAKEN_LATE" | "MISSED" | "REFUSED" | "SKIPPED" | string;
  takenAt?: string | Date | null;
  note?: string | null;
  reason?: string | null;
  loggedByType?: string | null;
  loggedById?: string | null;
  loggedAt?: string | Date | null;
  medication?: {
    id: string;
    name: string;
    dosage: string;
    instructions?: string | null;
  };
}

interface FamilyMedicationsClientProps {
  patient: {
    id: string;
    name: string;
    avatarColor?: string | null;
    caregiver?: { id: string; name: string; email: string; phone?: string | null } | null;
  };
  medications: Medication[];
  doseLogs: DoseItem[];
}

export default function FamilyMedicationsClient({
  patient,
  medications,
  doseLogs,
}: FamilyMedicationsClientProps) {
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [refillNote, setRefillNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // 1. Separate Today's Doses vs Past History
  const todayStr = new Date().toDateString();
  const todayDoses = doseLogs.filter(
    (d) => new Date(d.scheduledFor).toDateString() === todayStr
  );

  const todayTaken = todayDoses.filter(
    (d) => d.status === "TAKEN" || d.status === "TAKEN_LATE"
  ).length;
  const todayTotal = todayDoses.length;

  const problemDoses = todayDoses.filter(
    (d) => d.status === "MISSED" || d.status === "REFUSED"
  );

  // Overall adherence rate from logs (excluding skipped)
  const nonSkippedLogs = doseLogs.filter((d) => d.status !== "SKIPPED" && d.status !== "PENDING");
  const takenLogs = doseLogs.filter(
    (l) => l.status === "TAKEN" || l.status === "TAKEN_LATE"
  ).length;
  const adherenceRate =
    nonSkippedLogs.length > 0
      ? Math.round((takenLogs / nonSkippedLogs.length) * 100)
      : 100;

  const lowStockMeds = medications.filter(
    (m) =>
      m.remainingQuantity !== undefined &&
      m.remainingQuantity !== null &&
      m.refillThreshold !== undefined &&
      m.refillThreshold !== null &&
      m.remainingQuantity <= m.refillThreshold
  );

  const caregiverName = patient.caregiver?.name || "Caregiver";

  const handleRequestRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/family/refill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: selectedMed.id,
          note: refillNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit refill request");
      }

      setFeedback({
        type: "success",
        message: data.message || `Refill request submitted for ${selectedMed.name}.`,
      });
      setSelectedMed(null);
      setRefillNote("");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to submit refill request",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateInput: string | Date | undefined | null) => {
    if (!dateInput) return "—";
    const d = new Date(dateInput);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateInput: string | Date | undefined | null) => {
    if (!dateInput) return "—";
    const d = new Date(dateInput);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getDoseMarkerLabel = (dose: DoseItem) => {
    const actor = dose.loggedByType === "SYSTEM" ? "System" : caregiverName;
    const timeStr = dose.takenAt ? formatTime(dose.takenAt) : dose.loggedAt ? formatTime(dose.loggedAt) : "";

    switch (dose.status) {
      case "TAKEN":
        return `Taken${timeStr ? `, ${timeStr}` : ""}, marked by ${actor}`;
      case "TAKEN_LATE":
        return `Taken late${timeStr ? `, ${timeStr}` : ""}, marked by ${actor}`;
      case "REFUSED":
        return `Refused${timeStr ? `, ${timeStr}` : ""}, marked by ${actor}`;
      case "MISSED":
        return `Missed, marked by ${actor}`;
      case "SKIPPED":
        return `Skipped, marked by ${actor}`;
      case "PENDING":
      default:
        return `Pending (Scheduled for ${formatTime(dose.scheduledFor)})`;
    }
  };

  const parseTimes = (timesStr: string) => {
    try {
      const parsed = JSON.parse(timesStr);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch {
      // return as is
    }
    return timesStr;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Medications for ${patient.name}`}
        description="View-only schedule and dose administration tracking. Request refills directly from the primary caregiver."
      />

      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Administration"
          value={todayTotal > 0 ? `${todayTaken} of ${todayTotal} doses taken today` : "No doses scheduled"}
          subtext={
            problemDoses.length > 0
              ? `${problemDoses.length} dose(s) require clinical review`
              : "All scheduled doses completed"
          }
          icon={CheckCircle2}
          variant={problemDoses.length > 0 ? "rose" : "emerald"}
        />
        <StatCard
          label="Overall Adherence"
          value={`${adherenceRate}%`}
          subtext="Historical compliant intake"
          icon={Pill}
          variant="indigo"
        />
        <StatCard
          label="Active Prescriptions"
          value={medications.length}
          subtext="Active prescribed medications"
          icon={Calendar}
          variant="teal"
        />
        <StatCard
          label="Low Stock Warnings"
          value={lowStockMeds.length}
          subtext={lowStockMeds.length > 0 ? "Refill needed soon" : "All inventories adequate"}
          icon={AlertTriangle}
          variant={lowStockMeds.length > 0 ? "amber" : "violet"}
        />
      </div>

      {/* Plain Language Problem Alert Banner if any missed/refused today */}
      {problemDoses.length > 0 && (
        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 shadow-sm space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-200 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Today&apos;s Non-Adherence Alerts for {patient.name}</span>
          </div>
          <div className="space-y-1.5 pl-7">
            {problemDoses.map((d) => (
              <div key={d.id} className="text-xs text-rose-800 dark:text-rose-300">
                • <strong className="font-semibold">{patient.name}</strong> {d.status === "REFUSED" ? "refused" : "missed"} their{" "}
                <span className="font-semibold">{formatTime(d.scheduledFor)}</span> {d.medication?.name || "medication"}.
                {d.reason ? (
                  <span className="ml-1.5 italic bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-md font-normal">
                    Reason: {d.reason}
                  </span>
                ) : null}
                <span className="text-[11px] text-rose-500 dark:text-rose-400 ml-1.5">
                  — Logged by {d.loggedByType === "SYSTEM" ? "System" : caregiverName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dose History & Timeline */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Dose Administration Logs
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {doseLogs.length} total recorded doses
          </span>
        </div>

        {doseLogs.length === 0 ? (
          <EmptyState
            title="No Dose Records Yet"
            description="When caregiver logs or marks scheduled doses, administration details and reasons will display here."
            icon={Pill}
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {doseLogs.map((dose) => {
              const isToday = new Date(dose.scheduledFor).toDateString() === todayStr;

              return (
                <div
                  key={dose.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {dose.medication?.name || "Medication"}
                        </span>
                        <span className="text-slate-400">({dose.medication?.dosage || ""})</span>
                        {isToday && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            Today
                          </span>
                        )}
                      </div>

                      <div className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{getDoseMarkerLabel(dose)}</span>
                      </div>

                      {(dose.reason || dose.note) && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5 flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {dose.reason ? `Reason: "${dose.reason}"` : `Note: "${dose.note}"`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                    <StatusBadge
                      status={
                        dose.status === "TAKEN"
                          ? "COMPLETED"
                          : dose.status === "TAKEN_LATE"
                          ? "LATE"
                          : dose.status === "REFUSED"
                          ? "CANCELLED"
                          : dose.status === "MISSED"
                          ? "REJECTED"
                          : dose.status === "SKIPPED"
                          ? "PENDING"
                          : "UPCOMING"
                      }
                      label={
                        dose.status === "TAKEN"
                          ? "Taken"
                          : dose.status === "TAKEN_LATE"
                          ? "Taken Late"
                          : dose.status === "REFUSED"
                          ? "Refused"
                          : dose.status === "MISSED"
                          ? "Missed"
                          : dose.status === "SKIPPED"
                          ? "Skipped"
                          : "Pending"
                      }
                    />
                    <span className="text-[11px] text-slate-400">
                      {formatDate(dose.scheduledFor)} at {formatTime(dose.scheduledFor)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Medications List & Refill Request Area */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Prescribed Medications & Stock ({medications.length})
        </h3>

        {medications.length === 0 ? (
          <EmptyState
            title="No Prescriptions on File"
            description="The primary caregiver has not registered any active prescriptions for your loved one yet."
            icon={Pill}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {medications.map((med) => {
              const isLowStock =
                med.remainingQuantity !== undefined &&
                med.remainingQuantity !== null &&
                med.refillThreshold !== undefined &&
                med.refillThreshold !== null &&
                med.remainingQuantity <= med.refillThreshold;

              return (
                <div
                  key={med.id}
                  className={`p-5 rounded-3xl border transition-all space-y-4 ${
                    isLowStock
                      ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {med.name}
                        </h4>
                        <p className="text-xs text-slate-500">{med.dosage}</p>
                      </div>
                    </div>
                    {isLowStock && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Low Stock
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Frequency</div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                        {med.frequency}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Times of Day</div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                        {parseTimes(med.timesOfDay)}
                      </div>
                    </div>
                  </div>

                  {med.instructions && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl italic">
                      &quot;{med.instructions}&quot;
                    </p>
                  )}

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Stock: <strong className="text-slate-700 dark:text-slate-300">{med.remainingQuantity ?? 0} pills remaining</strong>
                    </span>
                    <button
                      onClick={() => {
                        setSelectedMed(med);
                        setRefillNote("");
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Request Refill</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Refill Request Modal */}
      {selectedMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Request Medication Refill
                  </h3>
                  <p className="text-xs text-slate-400">Alerts caregiver {caregiverName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMed(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
              <div className="font-bold">{selectedMed.name} ({selectedMed.dosage})</div>
              <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                Current remaining stock: {selectedMed.remainingQuantity ?? 0} pills
              </div>
            </div>

            <form onSubmit={handleRequestRefill} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Optional Note for Caregiver
                </label>
                <textarea
                  value={refillNote}
                  onChange={(e) => setRefillNote(e.target.value)}
                  placeholder="e.g. Bottle is almost empty. Please pick up prescription refill."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMed(null)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {submitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Send Refill Alert</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
