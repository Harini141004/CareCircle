"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Heart,
  Pill,
  Activity,
  Calendar,
  FileText,
  Phone,
  Shield,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Star,
  X,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { PageHeader, StatusBadge, EmptyState, SkeletonDetail } from "@/components/shared";

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  relationship: string;
  relationshipOther?: string | null;
  isPrimaryContact: boolean;
  isActive: boolean;
}

interface MedicationLog {
  id: string;
  scheduledFor: string;
  status: "TAKEN" | "MISSED" | "SKIPPED";
  takenAt?: string | null;
  notes?: string | null;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string; // JSON or comma-separated
  startDate: string;
  endDate?: string | null;
  stockCount: number;
  unit: string;
  instructions?: string | null;
  logs?: MedicationLog[];
}

interface SymptomLog {
  id: string;
  timestamp: string;
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

interface Appointment {
  id: string;
  doctorName: string;
  specialty?: string | null;
  location?: string | null;
  dateTime: string;
  reason?: string | null;
  status: string;
  checklistItems?: { id: string; task: string; isCompleted: boolean }[];
}

interface CareNote {
  id: string;
  type: "SHIFT_NOTE" | "HANDOVER";
  body: string;
  createdAt: string;
  caregiver: { id: string; name: string };
}

interface PatientData {
  id: string;
  name: string;
  dob: string;
  gender?: string | null;
  relationship: string;
  primaryCondition?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  emergencyContact?: string | null;
  notes?: string | null;
  avatarColor: string;
  medications: Medication[];
  symptomLogs: SymptomLog[];
  appointments: Appointment[];
  familyMembers: FamilyMember[];
  careNotes: CareNote[];
}

export default function PatientDetailClient({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"medications" | "vitals" | "appointments" | "notes">(
    "medications"
  );

  // Modals
  const [showLogDoseModal, setShowLogDoseModal] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [doseStatus, setDoseStatus] = useState<"TAKEN" | "MISSED" | "SKIPPED">("TAKEN");
  const [doseNotes, setDoseNotes] = useState("");
  const [submittingDose, setSubmittingDose] = useState(false);

  const [showLogVitalModal, setShowLogVitalModal] = useState(false);
  const [vitalForm, setVitalForm] = useState({
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    bloodSugar: "",
    heartRate: "",
    weight: "",
    temperature: "",
    mood: "GOOD",
    symptomSeverity: "0",
    notes: "",
  });
  const [submittingVital, setSubmittingVital] = useState(false);

  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({
    type: "SHIFT_NOTE" as "SHIFT_NOTE" | "HANDOVER",
    body: "",
  });
  const [submittingNote, setSubmittingNote] = useState(false);

  const fetchPatient = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/patients/${patientId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load patient record");
      }
      const data = await res.json();
      setPatient(data.patient);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  const handleLogDose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;
    setSubmittingDose(true);
    try {
      const res = await fetch("/api/dose-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: selectedMed.id,
          status: doseStatus,
          scheduledFor: new Date().toISOString(),
          notes: doseNotes || undefined,
        }),
      });
      if (res.ok) {
        setShowLogDoseModal(false);
        setSelectedMed(null);
        setDoseNotes("");
        await fetchPatient();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to log dose");
      }
    } catch (err) {
      console.error("Dose log error:", err);
    } finally {
      setSubmittingDose(false);
    }
  };

  const handleLogVital = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingVital(true);
    try {
      // Respect 0 values correctly!
      const payload: any = {
        patientId,
        mood: vitalForm.mood || undefined,
        notes: vitalForm.notes || undefined,
      };

      if (vitalForm.bloodPressureSystolic !== "" && !Number.isNaN(Number(vitalForm.bloodPressureSystolic))) {
        payload.bloodPressureSystolic = parseInt(vitalForm.bloodPressureSystolic, 10);
      }
      if (vitalForm.bloodPressureDiastolic !== "" && !Number.isNaN(Number(vitalForm.bloodPressureDiastolic))) {
        payload.bloodPressureDiastolic = parseInt(vitalForm.bloodPressureDiastolic, 10);
      }
      if (vitalForm.bloodSugar !== "" && !Number.isNaN(Number(vitalForm.bloodSugar))) {
        payload.bloodSugar = parseFloat(vitalForm.bloodSugar);
      }
      if (vitalForm.heartRate !== "" && !Number.isNaN(Number(vitalForm.heartRate))) {
        payload.heartRate = parseInt(vitalForm.heartRate, 10);
      }
      if (vitalForm.weight !== "" && !Number.isNaN(Number(vitalForm.weight))) {
        payload.weight = parseFloat(vitalForm.weight);
      }
      if (vitalForm.temperature !== "" && !Number.isNaN(Number(vitalForm.temperature))) {
        payload.temperature = parseFloat(vitalForm.temperature);
      }
      if (vitalForm.symptomSeverity !== "" && !Number.isNaN(Number(vitalForm.symptomSeverity))) {
        payload.symptomSeverity = parseInt(vitalForm.symptomSeverity, 10);
      }

      const res = await fetch("/api/symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowLogVitalModal(false);
        setVitalForm({
          bloodPressureSystolic: "",
          bloodPressureDiastolic: "",
          bloodSugar: "",
          heartRate: "",
          weight: "",
          temperature: "",
          mood: "GOOD",
          symptomSeverity: "0",
          notes: "",
        });
        await fetchPatient();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to record vitals");
      }
    } catch (err) {
      console.error("Vitals log error:", err);
    } finally {
      setSubmittingVital(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.body.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          type: noteForm.type,
          body: noteForm.body,
        }),
      });
      if (res.ok) {
        setShowAddNoteModal(false);
        setNoteForm({ type: "SHIFT_NOTE", body: "" });
        await fetchPatient();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save care note");
      }
    } catch (err) {
      console.error("Care note error:", err);
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return <SkeletonDetail />;
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <Link
          href="/patients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patients List
        </Link>
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
          <p className="font-semibold">{error || "Patient not found or unauthorized access"}</p>
        </div>
      </div>
    );
  }

  const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();
  const latestVital = patient.symptomLogs?.[0];

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/patients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assigned Patients</span>
        </Link>
        <span className="text-xs text-slate-400">ID: {patient.id.slice(0, 8)}</span>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-2.5"
          style={{ backgroundColor: patient.avatarColor || "#0D9488" }}
        />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pt-2">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl text-white font-black flex items-center justify-center text-2xl shadow-lg shrink-0"
              style={{ backgroundColor: patient.avatarColor || "#0D9488" }}
            >
              {patient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  {patient.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800">
                  Caregiver Relation: {patient.relationship}
                </span>
                {patient.gender && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {patient.gender}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1" suppressHydrationWarning>
                {age} years old • Born {new Date(patient.dob).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })} • Blood Type:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {patient.bloodType || "O+"}
                </span>
              </p>

              {patient.allergies && (
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Allergies: {patient.allergies}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/messages?patientId=${patient.id}`}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-teal-600" />
              <span>Care Circle Messages</span>
            </Link>
          </div>
        </div>

        {/* Clinical Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Primary Conditions
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {patient.primaryCondition || "None documented"}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Emergency Contact
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>{patient.emergencyContact || "No contact listed"}</span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Special Instructions
            </span>
            <p className="text-slate-700 dark:text-slate-300 truncate" title={patient.notes || ""}>
              {patient.notes || "No special instructions noted"}
            </p>
          </div>
        </div>

        {/* Linked Family Members list */}
        {patient.familyMembers && patient.familyMembers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Family Circle Contacts ({patient.familyMembers.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {patient.familyMembers.map((fm) => (
                <div
                  key={fm.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {fm.name}
                      </span>
                      {fm.isPrimaryContact && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {fm.relationship === "OTHER"
                        ? fm.relationshipOther || "Other"
                        : fm.relationship}{" "}
                      • {fm.phone || fm.email}
                    </div>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      fm.isActive ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                    title={fm.isActive ? "Active Account" : "Inactive Account"}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("medications")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activeTab === "medications"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Medications ({patient.medications?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("vitals")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activeTab === "vitals"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Vitals & Symptoms ({patient.symptomLogs?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("appointments")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activeTab === "appointments"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Appointments ({patient.appointments?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activeTab === "notes"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Care Notes ({patient.careNotes?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: MEDICATIONS */}
      {activeTab === "medications" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-600" />
              <span>Current Medication Regimen</span>
            </h3>
            <Link
              href="/medications"
              className="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1"
            >
              <span>Manage All Medications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {patient.medications && patient.medications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patient.medications.map((med) => {
                const isLowStock = med.stockCount <= 7;
                const latestLog = med.logs?.[0];

                return (
                  <div
                    key={med.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {med.name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {med.dosage} • {med.frequency}
                          </p>
                        </div>
                        {isLowStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                            Low Stock: {med.stockCount} {med.unit}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Stock: {med.stockCount} {med.unit}
                          </span>
                        )}
                      </div>

                      {med.instructions && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic mt-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                          {med.instructions}
                        </p>
                      )}

                      {latestLog && (
                        <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            Last Logged:{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {latestLog.status}
                            </span>{" "}
                            ({new Date(latestLog.scheduledFor).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })})
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                      <button
                        onClick={() => {
                          setSelectedMed(med);
                          setDoseStatus("TAKEN");
                          setShowLogDoseModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Quick Log Dose</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Pill}
              title="No medications on file"
              description="No active medications have been prescribed or registered for this patient."
              action={{ label: "Add Medication", href: "/medications" }}
            />
          )}
        </div>
      )}

      {/* TAB 2: VITALS & SYMPTOMS */}
      {activeTab === "vitals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>Clinical Vitals & Symptoms History</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Track blood pressure, heart rate, blood glucose, temperature, and symptom severity.
              </p>
            </div>
            <button
              onClick={() => setShowLogVitalModal(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Record Vitals</span>
            </button>
          </div>

          {/* Quick Metrics from Latest Reading */}
          {latestVital && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Blood Pressure
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {latestVital.bloodPressureSystolic !== null && latestVital.bloodPressureDiastolic !== null
                    ? `${latestVital.bloodPressureSystolic}/${latestVital.bloodPressureDiastolic}`
                    : "—"}
                  <span className="text-xs font-normal text-slate-400 ml-1">mmHg</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Heart Rate
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {latestVital.heartRate !== null ? latestVital.heartRate : "—"}
                  <span className="text-xs font-normal text-slate-400 ml-1">bpm</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Blood Glucose
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {latestVital.bloodSugar !== null ? latestVital.bloodSugar : "—"}
                  <span className="text-xs font-normal text-slate-400 ml-1">mg/dL</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Symptom Severity
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {latestVital.symptomSeverity !== null ? `${latestVital.symptomSeverity}/10` : "0/10"}
                </p>
              </div>
            </div>
          )}

          {/* Vitals History Table */}
          {patient.symptomLogs && patient.symptomLogs.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">BP (mmHg)</th>
                      <th className="py-3 px-4">HR (bpm)</th>
                      <th className="py-3 px-4">Glucose (mg/dL)</th>
                      <th className="py-3 px-4">Weight (kg)</th>
                      <th className="py-3 px-4">Temp (°C)</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {patient.symptomLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                          {new Date(log.timestamp).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {log.bloodPressureSystolic !== null && log.bloodPressureDiastolic !== null
                            ? `${log.bloodPressureSystolic}/${log.bloodPressureDiastolic}`
                            : "—"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {log.heartRate !== null ? log.heartRate : "—"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {log.bloodSugar !== null ? log.bloodSugar : "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {log.weight !== null ? `${log.weight} kg` : "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {log.temperature !== null ? `${log.temperature}°C` : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              (log.symptomSeverity ?? 0) >= 7
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                : (log.symptomSeverity ?? 0) >= 4
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            {log.symptomSeverity ?? 0}/10
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {log.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No vitals logged yet"
              description="Record the first set of vitals or symptoms for this patient."
              action={{ label: "Record Vitals", onClick: () => setShowLogVitalModal(true) }}
            />
          )}
        </div>
      )}

      {/* TAB 3: APPOINTMENTS */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>Medical Appointments</span>
            </h3>
            <Link
              href="/appointments"
              className="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1"
            >
              <span>View All Appointments</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {patient.appointments && patient.appointments.length > 0 ? (
            <div className="space-y-3">
              {patient.appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {apt.doctorName}
                        </h4>
                        {apt.specialty && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {apt.specialty}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            apt.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700"
                              : apt.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(apt.dateTime).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {new Date(apt.dateTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {apt.location && ` • ${apt.location}`}
                      </p>
                      {apt.reason && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                          Reason: {apt.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/appointments`}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      Open Checklist ({apt.checklistItems?.length || 0})
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No appointments scheduled"
              description="No clinical consultations or hospital visits are scheduled for this patient."
              action={{ label: "Schedule Appointment", href: "/appointments" }}
            />
          )}
        </div>
      )}

      {/* TAB 4: CARE NOTES */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>Shift Notes & Handover Logs</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Maintain clinical communication with family and relief caregivers.
              </p>
            </div>
            <button
              onClick={() => setShowAddNoteModal(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Care Note</span>
            </button>
          </div>

          {patient.careNotes && patient.careNotes.length > 0 ? (
            <div className="space-y-3">
              {patient.careNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          note.type === "HANDOVER"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                            : "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                        }`}
                      >
                        {note.type === "HANDOVER" ? "Handover Note" : "Daily Shift Note"}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        By {note.caregiver?.name || "Caregiver"}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(note.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {note.body}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No care notes recorded"
              description="Record daily shift summaries, behavioral observations, or handover notes."
              action={{ label: "Add Care Note", onClick: () => setShowAddNoteModal(true) }}
            />
          )}
        </div>
      )}

      {/* QUICK LOG DOSE MODAL */}
      {showLogDoseModal && selectedMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Log Dose for {selectedMed.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedMed.dosage} • {selectedMed.frequency}
                </p>
              </div>
              <button
                onClick={() => setShowLogDoseModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogDose} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["TAKEN", "MISSED", "SKIPPED"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDoseStatus(st)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        doseStatus === st
                          ? st === "TAKEN"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : st === "MISSED"
                            ? "bg-rose-600 text-white border-rose-600"
                            : "bg-amber-600 text-white border-amber-600"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Observations (Optional)
                </label>
                <textarea
                  rows={2}
                  value={doseNotes}
                  onChange={(e) => setDoseNotes(e.target.value)}
                  placeholder="e.g. Taken with breakfast and glass of water"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLogDoseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDose}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {submittingDose ? "Logging..." : "Confirm Dose"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD VITALS MODAL */}
      {showLogVitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Record Vitals & Symptoms
                </h3>
                <p className="text-xs text-slate-500">Patient: {patient.name}</p>
              </div>
              <button
                onClick={() => setShowLogVitalModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogVital} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    value={vitalForm.bloodPressureSystolic}
                    onChange={(e) =>
                      setVitalForm({ ...vitalForm, bloodPressureSystolic: e.target.value })
                    }
                    placeholder="120"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    value={vitalForm.bloodPressureDiastolic}
                    onChange={(e) =>
                      setVitalForm({ ...vitalForm, bloodPressureDiastolic: e.target.value })
                    }
                    placeholder="80"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    value={vitalForm.heartRate}
                    onChange={(e) => setVitalForm({ ...vitalForm, heartRate: e.target.value })}
                    placeholder="72"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Blood Glucose (mg/dL)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalForm.bloodSugar}
                    onChange={(e) => setVitalForm({ ...vitalForm, bloodSugar: e.target.value })}
                    placeholder="95.5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalForm.weight}
                    onChange={(e) => setVitalForm({ ...vitalForm, weight: e.target.value })}
                    placeholder="68.0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Body Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalForm.temperature}
                    onChange={(e) => setVitalForm({ ...vitalForm, temperature: e.target.value })}
                    placeholder="36.8"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Symptom Severity (0 to 10)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={vitalForm.symptomSeverity}
                    onChange={(e) =>
                      setVitalForm({ ...vitalForm, symptomSeverity: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    General Mood
                  </label>
                  <select
                    value={vitalForm.mood}
                    onChange={(e) => setVitalForm({ ...vitalForm, mood: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good / Calm</option>
                    <option value="FAIR">Fair / Neutral</option>
                    <option value="ANXIOUS">Anxious / Restless</option>
                    <option value="DISTRESSED">Distressed / In Pain</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Notes / Observations
                </label>
                <textarea
                  rows={2}
                  value={vitalForm.notes}
                  onChange={(e) => setVitalForm({ ...vitalForm, notes: e.target.value })}
                  placeholder="e.g. Slightly elevated BP after afternoon walk. Patient reported feeling well."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLogVitalModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVital}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {submittingVital ? "Saving..." : "Save Vitals"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CARE NOTE MODAL */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Add Care Note
                </h3>
                <p className="text-xs text-slate-500">Patient: {patient.name}</p>
              </div>
              <button
                onClick={() => setShowAddNoteModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNote} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Note Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNoteForm({ ...noteForm, type: "SHIFT_NOTE" })}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      noteForm.type === "SHIFT_NOTE"
                        ? "bg-teal-600 text-white border-teal-600"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    Daily Shift Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteForm({ ...noteForm, type: "HANDOVER" })}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      noteForm.type === "HANDOVER"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    Handover Note
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
                  value={noteForm.body}
                  onChange={(e) => setNoteForm({ ...noteForm, body: e.target.value })}
                  placeholder={
                    noteForm.type === "HANDOVER"
                      ? "Summary for incoming caregiver or family: hydration status, pending tasks, medication updates..."
                      : "Describe how the patient felt, meals eaten, activities, mood..."
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {submittingNote ? "Saving..." : "Save Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
