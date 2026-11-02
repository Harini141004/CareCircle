"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  User,
  Clock,
  ChevronRight,
  X,
  Share2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, EmptyState, SkeletonDetail } from "@/components/shared";
import { usePatientContext } from "@/context/PatientContext";

interface CareNoteItem {
  id: string;
  type: "SHIFT_NOTE" | "HANDOVER";
  body: string;
  createdAt: string;
  caregiver: {
    id: string;
    name: string;
  };
  patient: {
    id: string;
    name: string;
    avatarColor: string;
  };
}

export default function CareNotesClient() {
  const { patients } = usePatientContext();
  const [notes, setNotes] = useState<CareNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedPatientId, setSelectedPatientId] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetPatientId, setTargetPatientId] = useState(patients[0]?.id || "");
  const [noteType, setNoteType] = useState<"SHIFT_NOTE" | "HANDOVER">("SHIFT_NOTE");
  const [noteBody, setNoteBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const url =
        selectedPatientId !== "all"
          ? `/api/notes?patientId=${selectedPatientId}`
          : "/api/notes";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    if (patients.length > 0 && !targetPatientId) {
      setTargetPatientId(patients[0].id);
    }
  }, [patients, targetPatientId]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim() || !targetPatientId) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: targetPatientId,
          type: noteType,
          body: noteBody.trim(),
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNoteBody("");
        setNoteType("SHIFT_NOTE");
        await fetchNotes();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save note");
      }
    } catch (err) {
      console.error("Save note error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered notes
  const filteredNotes = notes.filter((n) => {
    if (selectedType !== "all" && n.type !== selectedType) return false;
    if (
      searchQuery.trim() &&
      !n.body.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !n.patient.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const shiftNotesCount = notes.filter((n) => n.type === "SHIFT_NOTE").length;
  const handoverNotesCount = notes.filter((n) => n.type === "HANDOVER").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Notes & Clinical Handovers"
        description="Daily behavioral documentation, patient care observations, and continuity handovers across shifts."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchNotes();
              }}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Refresh notes"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Note</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Notes"
          value={notes.length}
          subtext="Documented clinical history"
          variant="indigo"
          icon={FileText}
        />
        <StatCard
          label="Shift Notes"
          value={shiftNotesCount}
          subtext="Daily care logs"
          variant="teal"
          icon={Clock}
        />
        <StatCard
          label="Shift Handovers"
          value={handoverNotesCount}
          subtext="Caregiver relay summaries"
          variant="violet"
          icon={Share2}
        />
        <StatCard
          label="Active Patients"
          value={patients.length}
          subtext="Patients with records"
          variant="amber"
          icon={User}
        />
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes content or patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Patient Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Patient:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Assigned Patients</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Note Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Types</option>
              <option value="SHIFT_NOTE">Daily Shift Note</option>
              <option value="HANDOVER">Handover Note</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notes Feed */}
      {loading ? (
        <SkeletonDetail />
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No care notes found"
          description="Record daily patient observations, meal details, hydration status, or handovers for relief caregivers."
          action={{
            label: "Create First Note",
            onClick: () => setShowAddModal(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-white"
                    style={{ backgroundColor: note.patient.avatarColor || "#0D9488" }}
                  >
                    {note.patient.name}
                  </span>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      note.type === "HANDOVER"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                        : "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                    }`}
                  >
                    {note.type === "HANDOVER" ? "Handover Note" : "Shift Observation"}
                  </span>

                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    By {note.caregiver?.name || "Caregiver"}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(note.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Link
                    href={`/patients/${note.patient.id}`}
                    className="text-teal-600 hover:underline font-bold flex items-center gap-0.5"
                  >
                    <span>Chart</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {note.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>Add Patient Care Note</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Patient *
                </label>
                <select
                  required
                  value={targetPatientId}
                  onChange={(e) => setTargetPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.relationship})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Note Classification *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNoteType("SHIFT_NOTE")}
                    className={`py-2 rounded-xl font-bold border transition-colors ${
                      noteType === "SHIFT_NOTE"
                        ? "bg-teal-600 text-white border-teal-600"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    Daily Shift Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteType("HANDOVER")}
                    className={`py-2 rounded-xl font-bold border transition-colors ${
                      noteType === "HANDOVER"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    Shift Handover Log
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Note Content *
                </label>
                <textarea
                  rows={4}
                  required
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder={
                    noteType === "HANDOVER"
                      ? "Summary for incoming caregiver or family: hydration status, pending tasks, medication updates..."
                      : "Describe how the patient felt, meals eaten, activities, mood..."
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Care Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
