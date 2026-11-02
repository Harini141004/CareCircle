"use client";

import React, { useState, useEffect } from "react";
import { usePatientContext } from "@/context/PatientContext";
import {
  Pill,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  X,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timesOfDay: string;
  instructions?: string;
  prescribingDoctor?: string;
  totalQuantity: number;
  remainingQuantity: number;
  refillThreshold: number;
  isActive: boolean;
  patient: { id: string; name: string; avatarColor: string };
  logs: Array<{ id: string; scheduledFor: string; status: string; takenAt?: string; notes?: string }>;
}

const EMPTY_FORM = {
  patientId: "",
  name: "",
  dosage: "",
  frequency: "Once Daily",
  timeOfDay: "08:00",
  instructions: "",
  prescribingDoctor: "",
  totalQuantity: "30",
  refillThreshold: "7",
};

export default function MedicationsPage() {
  const { activePatientId, patients } = usePatientContext();
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMed, setEditingMed] = useState<MedicationItem | null>(null);
  const [expandedMed, setExpandedMed] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/medications?patientId=${activePatientId}`);
      if (res.ok) {
        const data = await res.json();
        setMedications(data.medications || []);
      }
    } catch (err) {
      console.error("Error loading meds:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedications(); }, [activePatientId]);

  const openCreate = () => {
    setEditingMed(null);
    setForm({ ...EMPTY_FORM, patientId: activePatientId !== "all" ? activePatientId : patients[0]?.id || "" });
    setShowModal(true);
  };

  const openEdit = (med: MedicationItem) => {
    setEditingMed(med);
    let times = ["08:00"];
    try { times = JSON.parse(med.timesOfDay); } catch (e) {}
    setForm({
      patientId: med.patient.id,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      timeOfDay: times[0] || "08:00",
      instructions: med.instructions || "",
      prescribingDoctor: med.prescribingDoctor || "",
      totalQuantity: String(med.totalQuantity),
      refillThreshold: String(med.refillThreshold),
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        patientId: form.patientId,
        name: form.name,
        dosage: form.dosage,
        frequency: form.frequency,
        timesOfDay: [form.timeOfDay],
        instructions: form.instructions,
        prescribingDoctor: form.prescribingDoctor,
        totalQuantity: form.totalQuantity,
        remainingQuantity: form.totalQuantity,
        refillThreshold: form.refillThreshold,
      };

      let res;
      if (editingMed) {
        res = await fetch(`/api/medications/${editingMed.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/medications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        await fetchMedications();
        setShowModal(false);
        showToast(editingMed ? "Medication updated successfully!" : "Medication added successfully!");
      }
    } catch (err) {
      console.error("Error saving medication:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (med: MedicationItem) => {
    if (!confirm(`Delete ${med.name} (${med.dosage}) from ${med.patient.name}'s profile? This will also remove all adherence history.`)) return;
    try {
      const res = await fetch(`/api/medications/${med.id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchMedications();
        showToast(`${med.name} removed.`);
      }
    } catch (err) {
      console.error("Error deleting medication:", err);
    }
  };

  const handleLogStatus = async (medId: string, status: "TAKEN" | "MISSED" | "SKIPPED") => {
    try {
      const res = await fetch(`/api/medications/${medId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchMedications();
        const label = status === "TAKEN" ? "✓ Dose logged as taken!" : status === "MISSED" ? "✗ Dose marked as missed." : "→ Dose marked as skipped.";
        showToast(label);
      }
    } catch (err) {
      console.error("Log status error:", err);
    }
  };

  const handleToggleActive = async (med: MedicationItem) => {
    try {
      const res = await fetch(`/api/medications/${med.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !med.isActive }),
      });
      if (res.ok) {
        await fetchMedications();
        showToast(med.isActive ? "Medication paused." : "Medication resumed.");
      }
    } catch (err) {
      console.error("Toggle active error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl cc-dialog text-xs font-semibold shadow-2xl border animate-in slide-in-from-bottom-4 duration-300">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Pill className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Medication & Refill Tracker
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Log daily doses, track pill counts, and receive auto-refill alerts per patient.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMedications}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Medication
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && medications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center">
            <Pill className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">No medications yet</h3>
            <p className="text-sm text-slate-500 mt-1">Add a prescribed medication to start tracking doses and refills.</p>
          </div>
          <button onClick={openCreate} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors">
            + Add First Medication
          </button>
        </div>
      )}

      {/* Medication Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medications.map((med) => {
            const isLowStock = med.remainingQuantity <= med.refillThreshold;
            const percentage = Math.max(Math.round((med.remainingQuantity / med.totalQuantity) * 100), 5);
            const totalLogs = med.logs.length;
            const takenLogs = med.logs.filter((l) => l.status === "TAKEN").length;
            const missedLogs = med.logs.filter((l) => l.status === "MISSED").length;
            const adherenceRate = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 100;
            const isExpanded = expandedMed === med.id;

            return (
              <div
                key={med.id}
                className={`rounded-3xl bg-white dark:bg-slate-900 border shadow-sm relative overflow-hidden flex flex-col transition-all ${
                  isLowStock
                    ? "border-amber-400/80 dark:border-amber-700/80 ring-1 ring-amber-400/20"
                    : "border-slate-200 dark:border-slate-800"
                } ${!med.isActive ? "opacity-60" : ""}`}
              >
                {/* Patient Badge + Active Status Bar */}
                <div className="h-1.5" style={{ backgroundColor: med.patient.avatarColor }} />

                <div className="p-5 space-y-4 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white inline-flex items-center shrink-0"
                          style={{ backgroundColor: med.patient.avatarColor }}
                        >
                          {med.patient.name.split(" ")[0]}
                        </span>
                        {!med.isActive && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500">
                            Paused
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight truncate">
                        {med.name}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {med.dosage} · {med.frequency}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl whitespace-nowrap">
                        {adherenceRate}%
                      </span>
                    </div>
                  </div>

                  {/* Instructions */}
                  {med.instructions && (
                    <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{med.instructions}</span>
                    </div>
                  )}

                  {/* Pill Supply Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Pill Supply</span>
                      <span className={isLowStock ? "text-amber-600 font-extrabold" : "text-slate-700 dark:text-slate-300"}>
                        {med.remainingQuantity}/{med.totalQuantity} units
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isLowStock ? "bg-amber-500" : "bg-indigo-500"}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {isLowStock && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Refill needed — only {med.remainingQuantity} left!
                      </div>
                    )}
                  </div>

                  {/* Dose Actions */}
                  {med.isActive && (
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleLogStatus(med.id, "TAKEN")}
                        className="py-2 px-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Taken
                      </button>
                      <button
                        onClick={() => handleLogStatus(med.id, "MISSED")}
                        className="py-2 px-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Missed
                      </button>
                      <button
                        onClick={() => handleLogStatus(med.id, "SKIPPED")}
                        className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(med)}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        title="Edit Medication"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(med)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Medication"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(med)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                          med.isActive
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-700"
                            : "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-200"
                        }`}
                      >
                        {med.isActive ? "Pause" : "Resume"}
                      </button>
                    </div>

                    <button
                      onClick={() => setExpandedMed(isExpanded ? null : med.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      History {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expanded History */}
                  {isExpanded && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <span>Recent Doses ({totalLogs} logs)</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{takenLogs} taken · {missedLogs} missed</span>
                      </div>
                      {med.logs.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">No dose logs yet.</p>
                      ) : (
                        med.logs.slice(0, 7).map((log) => (
                          <div key={log.id} className="flex items-center justify-between text-[11px] py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                            <span className="text-slate-500">
                              {new Date(log.scheduledFor).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded-full ${
                                log.status === "TAKEN"
                                  ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                                  : log.status === "MISSED"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Medication Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="cc-dialog border rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                {editingMed ? `Edit: ${editingMed.name}` : "Add Prescription Medication"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assign to Patient *</label>
                <select
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={!!editingMed}
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.relationship})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Medication Name *</label>
                  <input
                    type="text" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Lisinopril"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Dosage *</label>
                  <input
                    type="text" required value={form.dosage}
                    onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                    placeholder="e.g. 10mg"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Once Daily">Once Daily</option>
                    <option value="Twice Daily">Twice Daily</option>
                    <option value="Three Times Daily">Three Times Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="As Needed">As Needed</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Time of Day</label>
                  <input
                    type="time" value={form.timeOfDay}
                    onChange={(e) => setForm({ ...form, timeOfDay: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Quantity</label>
                  <input
                    type="number" value={form.totalQuantity}
                    onChange={(e) => setForm({ ...form, totalQuantity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Refill Alert Threshold</label>
                  <input
                    type="number" value={form.refillThreshold}
                    onChange={(e) => setForm({ ...form, refillThreshold: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Prescribing Doctor</label>
                <input
                  type="text" value={form.prescribingDoctor}
                  onChange={(e) => setForm({ ...form, prescribingDoctor: e.target.value })}
                  placeholder="e.g. Dr. Robert Vance, MD"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Instructions / Notes</label>
                <input
                  type="text" value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  placeholder="e.g. Take morning with food"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors">
                  {submitting ? "Saving..." : editingMed ? "Update Medication" : "Add Medication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
