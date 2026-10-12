"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePatientContext } from "@/context/PatientContext";
import {
  Calendar,
  CheckSquare,
  Square,
  Plus,
  MapPin,
  Clock,
  User,
  FileText,
  Sparkles,
  ChevronRight,
  X,
  Trash2,
  Edit2,
  Check,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface ChecklistItem {
  id: string;
  task: string;
  isCompleted: boolean;
}

interface AppointmentItem {
  id: string;
  doctorName: string;
  specialty?: string;
  location?: string;
  dateTime: string;
  reason?: string;
  notes?: string;
  status: string;
  patient: { id: string; name: string; avatarColor: string; primaryCondition?: string };
  checklistItems: ChecklistItem[];
}

const STATUSES = ["UPCOMING", "COMPLETED", "CANCELLED", "RESCHEDULED"];

export default function AppointmentsPage() {
  const { activePatientId, patients } = usePatientContext();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState<AppointmentItem | null>(null);
  const [newTaskInputs, setNewTaskInputs] = useState<{ [apptId: string]: string }>({});
  const [toastMsg, setToastMsg] = useState("");

  // Form states
  const [formPatientId, setFormPatientId] = useState(patients[0]?.id || "");
  const [formDoctorName, setFormDoctorName] = useState("");
  const [formSpecialty, setFormSpecialty] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDateTime, setFormDateTime] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("UPCOMING");
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/appointments?patientId=${activePatientId}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error("Error loading appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, [activePatientId]);

  const resetForm = () => {
    setFormPatientId(activePatientId !== "all" ? activePatientId : patients[0]?.id || "");
    setFormDoctorName(""); setFormSpecialty(""); setFormLocation("");
    setFormDateTime(""); setFormReason(""); setFormNotes(""); setFormStatus("UPCOMING");
    setEditingAppt(null);
  };

  const openCreate = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEdit = (appt: AppointmentItem) => {
    setEditingAppt(appt);
    setFormPatientId(appt.patient.id);
    setFormDoctorName(appt.doctorName);
    setFormSpecialty(appt.specialty || "");
    setFormLocation(appt.location || "");
    // Format to local datetime-local value
    const local = new Date(appt.dateTime);
    const pad = (n: number) => String(n).padStart(2, "0");
    setFormDateTime(`${local.getFullYear()}-${pad(local.getMonth()+1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`);
    setFormReason(appt.reason || "");
    setFormNotes(appt.notes || "");
    setFormStatus(appt.status);
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        patientId: formPatientId,
        doctorName: formDoctorName,
        specialty: formSpecialty,
        location: formLocation,
        dateTime: formDateTime,
        reason: formReason,
        notes: formNotes,
        status: formStatus,
      };

      let res;
      if (editingAppt) {
        res = await fetch(`/api/appointments/${editingAppt.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        await fetchAppointments();
        setShowAddModal(false);
        resetForm();
        showToast(editingAppt ? "Appointment updated!" : "Appointment scheduled successfully!");
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (appt: AppointmentItem) => {
    if (!confirm(`Delete appointment with ${appt.doctorName} on ${new Date(appt.dateTime).toLocaleDateString()}? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchAppointments();
        showToast("Appointment deleted.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleUpdateStatus = async (apptId: string, status: string) => {
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchAppointments();
        showToast(`Appointment marked as ${status.toLowerCase()}.`);
      }
    } catch (err) {
      console.error("Update status error:", err);
    }
  };

  const handleToggleChecklistItem = async (apptId: string, itemId: string, currentState: boolean) => {
    try {
      const res = await fetch(`/api/checklist/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !currentState }),
      });
      if (res.ok) {
        setAppointments((prev) =>
          prev.map((appt) =>
            appt.id === apptId
              ? {
                  ...appt,
                  checklistItems: appt.checklistItems.map((item) =>
                    item.id === itemId ? { ...item, isCompleted: !currentState } : item
                  ),
                }
              : appt
          )
        );
      }
    } catch (err) {
      console.error("Toggle checklist error:", err);
    }
  };

  const handleDeleteChecklistItem = async (apptId: string, itemId: string) => {
    try {
      const res = await fetch(`/api/checklist/${itemId}`, { method: "DELETE" });
      if (res.ok) {
        setAppointments((prev) =>
          prev.map((appt) =>
            appt.id === apptId
              ? { ...appt, checklistItems: appt.checklistItems.filter((i) => i.id !== itemId) }
              : appt
          )
        );
        showToast("Checklist item removed.");
      }
    } catch (err) {
      console.error("Delete checklist item error:", err);
    }
  };

  const handleAddChecklistTask = async (apptId: string) => {
    const task = (newTaskInputs[apptId] || "").trim();
    if (!task) return;
    try {
      const res = await fetch(`/api/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: apptId, task }),
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments((prev) =>
          prev.map((appt) =>
            appt.id === apptId
              ? { ...appt, checklistItems: [...appt.checklistItems, data.item] }
              : appt
          )
        );
        setNewTaskInputs((prev) => ({ ...prev, [apptId]: "" }));
      }
    } catch (err) {
      console.error("Add task error:", err);
    }
  };

  const statusStyles: Record<string, string> = {
    UPCOMING: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300",
    COMPLETED: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
    CANCELLED: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
    RESCHEDULED: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  };

  const upcoming = appointments.filter(a => a.status === "UPCOMING");
  const past = appointments.filter(a => a.status !== "UPCOMING");

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
            <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Doctor Appointments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Schedule visits, track pre-visit checklists, and manage appointment history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAppointments} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Schedule Appointment
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-52 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)}
        </div>
      )}

      {!loading && appointments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">No appointments yet</h3>
            <p className="text-sm text-slate-500 mt-1">Schedule a doctor visit to start tracking pre-visit tasks.</p>
          </div>
          <button onClick={openCreate} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors">
            + Schedule First Appointment
          </button>
        </div>
      )}

      {/* Upcoming Appointments */}
      {!loading && upcoming.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upcoming ({upcoming.length})</h2>
          {upcoming.map((appt) => {
            const done = appt.checklistItems.filter(i => i.isCompleted).length;
            const total = appt.checklistItems.length;
            const apptDate = new Date(appt.dateTime);
            const daysUntil = Math.ceil((apptDate.getTime() - Date.now()) / 86400000);

            return (
              <div key={appt.id} className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: appt.patient.avatarColor }} />
                <div className="p-5 space-y-4">
                  {/* Appointment Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white" style={{ backgroundColor: appt.patient.avatarColor }}>
                          {appt.patient.name}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${statusStyles[appt.status]}`}>
                          {appt.status}
                        </span>
                        {daysUntil <= 3 && daysUntil > 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> In {daysUntil} day{daysUntil !== 1 ? "s" : ""}!
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">
                        {appt.doctorName}
                        {appt.specialty && <span className="text-slate-500 font-normal text-sm"> · {appt.specialty}</span>}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {apptDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })} at {apptDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {appt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {appt.location}
                          </span>
                        )}
                      </div>
                      {appt.reason && (
                        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 italic">Reason: {appt.reason}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => openEdit(appt)} className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(appt)} className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs font-semibold text-slate-500 shrink-0">Mark as:</span>
                    {["COMPLETED", "CANCELLED", "RESCHEDULED"].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleUpdateStatus(appt.id, s)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                          s === "COMPLETED" ? "bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
                          : s === "CANCELLED" ? "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
                        }`}
                      >
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </button>
                    ))}

                    <Link
                      href={`/reports?patientId=${appt.patient.id}`}
                      className="ml-auto px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1.5 hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" /><Sparkles className="w-3 h-3" /> Generate Summary
                    </Link>
                  </div>

                  {/* Pre-visit Checklist */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                        Pre-visit Checklist
                      </h4>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{done}/{total} Done</span>
                    </div>

                    <div className="space-y-1.5">
                      {appt.checklistItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2.5 group py-0.5">
                          <button
                            onClick={() => handleToggleChecklistItem(appt.id, item.id, item.isCompleted)}
                            className="shrink-0 text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            {item.isCompleted ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <span className={`flex-1 text-xs ${item.isCompleted ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>
                            {item.task}
                          </span>
                          <button
                            onClick={() => handleDeleteChecklistItem(appt.id, item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-300 hover:text-rose-500 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add task input */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                      <input
                        type="text"
                        placeholder="+ Add checklist item..."
                        value={newTaskInputs[appt.id] || ""}
                        onChange={(e) => setNewTaskInputs((prev) => ({ ...prev, [appt.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddChecklistTask(appt.id); } }}
                        className="flex-1 text-xs px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => handleAddChecklistTask(appt.id)}
                        className="p-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Past Appointments */}
      {!loading && past.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Past & Other ({past.length})</h2>
          {past.map((appt) => (
            <div key={appt.id} className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm opacity-80 overflow-hidden">
              <div className="h-1 bg-slate-200 dark:bg-slate-700" />
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white" style={{ backgroundColor: appt.patient.avatarColor }}>
                      {appt.patient.name.split(" ")[0]}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${statusStyles[appt.status]}`}>
                      {appt.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">{appt.doctorName}
                    {appt.specialty && <span className="text-slate-400 font-normal"> · {appt.specialty}</span>}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(appt.dateTime).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    {appt.reason && <span className="ml-2 text-slate-300">· {appt.reason}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(appt)} className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(appt)} className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="cc-dialog border rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                {editingAppt ? "Edit Appointment" : "Schedule Appointment"}
              </h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Patient *</label>
                <select
                  value={formPatientId}
                  onChange={(e) => setFormPatientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={!!editingAppt}
                >
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Doctor's Name *</label>
                  <input required type="text" value={formDoctorName} onChange={(e) => setFormDoctorName(e.target.value)} placeholder="Dr. Jane Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Specialty</label>
                  <input type="text" value={formSpecialty} onChange={(e) => setFormSpecialty(e.target.value)} placeholder="Cardiology"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date & Time *</label>
                  <input required type="datetime-local" value={formDateTime} onChange={(e) => setFormDateTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Location / Clinic</label>
                <input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="e.g. St. Mary's Hospital, 2nd Floor"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason for Visit</label>
                <input type="text" value={formReason} onChange={(e) => setFormReason(e.target.value)} placeholder="e.g. Quarterly blood pressure review"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Additional Notes</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Special instructions, insurance info, etc." rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors">
                  {submitting ? "Saving..." : editingAppt ? "Update Appointment" : "Schedule Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
