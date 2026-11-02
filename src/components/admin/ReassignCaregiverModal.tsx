"use client";

import React, { useState, useEffect } from "react";
import { X, UserCheck, AlertCircle, Loader2, ArrowRight } from "lucide-react";

interface ReassignCaregiverModalProps {
  patient: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  verifiedCaregivers: { id: string; name: string; email: string; phone?: string | null }[];
}

export function ReassignCaregiverModal({
  patient,
  isOpen,
  onClose,
  onSuccess,
  verifiedCaregivers,
}: ReassignCaregiverModalProps) {
  const [selectedCaregiverId, setSelectedCaregiverId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (patient && isOpen) {
      setError("");
      setSelectedCaregiverId(patient.caregiverId || verifiedCaregivers[0]?.id || "");
    }
  }, [patient, isOpen, verifiedCaregivers]);

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedCaregiverId) {
      setError("Please select a verified caregiver");
      return;
    }

    if (selectedCaregiverId === patient.caregiverId) {
      setError("Please select a different caregiver than the currently assigned one");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/patients/${patient.id}/caregiver`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caregiverId: selectedCaregiverId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reassign caregiver");
        return;
      }

      onSuccess(
        `Successfully reassigned ${patient.name} to new caregiver "${data.caregiver?.name || "Caregiver"}"`
      );
      onClose();
    } catch {
      setError("A network error occurred while reassigning caregiver");
    } finally {
      setSubmitting(false);
    }
  };

  const currentCaregiver = verifiedCaregivers.find((c) => c.id === patient.caregiverId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Reassign Primary Caregiver
              </h2>
              <p className="text-[11px] text-slate-500">
                Patient: <strong className="font-semibold text-slate-700 dark:text-slate-300">{patient.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Caregiver Info Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Currently Assigned Caregiver
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {currentCaregiver ? currentCaregiver.name : patient.caregiver?.name || "None / Unassigned"}
            </div>
            <div className="text-xs text-slate-500">
              {currentCaregiver ? currentCaregiver.email : patient.caregiver?.email || ""}
            </div>
          </div>

          {/* Reassignment Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assign to New Verified Caregiver <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedCaregiverId}
              onChange={(e) => setSelectedCaregiverId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {verifiedCaregivers.length === 0 ? (
                <option value="">No verified caregivers available</option>
              ) : (
                verifiedCaregivers.map((cg) => (
                  <option key={cg.id} value={cg.id}>
                    {cg.name} ({cg.email}) {cg.id === patient.caregiverId ? "— (Current)" : ""}
                  </option>
                ))
              )}
            </select>
            <div className="mt-2 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
              <strong>Seamless Transfer:</strong> Open notifications and alerts for {patient.name} will be automatically re-routed to the newly assigned caregiver in an atomic database transaction.
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-900/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Reassigning...</span>
                </>
              ) : (
                <>
                  <span>Confirm Reassignment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
