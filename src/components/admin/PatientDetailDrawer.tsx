"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Users,
  ShieldCheck,
  Heart,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  FileText,
  Pill,
  Activity,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";

interface PatientDetailDrawerProps {
  patientId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PatientDetailDrawer({
  patientId,
  isOpen,
  onClose,
}: PatientDetailDrawerProps) {
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (patientId && isOpen) {
      setLoading(true);
      setError("");
      fetch(`/api/admin/users/patient/${patientId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load patient details");
          return res.json();
        })
        .then((data) => {
          setPatient(data.user);
        })
        .catch((err) => {
          setError(err.message || "Failed to load patient details");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setPatient(null);
    }
  }, [patientId, isOpen]);

  if (!isOpen) return null;

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    const ageDt = new Date(diff);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const formatRelationship = (rel: string, relOther?: string | null, patientName?: string) => {
    const title = rel === "OTHER" ? (relOther || "Other") : rel.charAt(0) + rel.slice(1).toLowerCase();
    return patientName ? `${title} of ${patientName}` : title;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-base font-bold shadow-md"
                style={{ backgroundColor: patient?.avatarColor || "#0D9488" }}
              >
                {patient ? patient.name.charAt(0) : "P"}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{patient?.name || "Patient Profile"}</span>
                  {patient && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        patient.isActive
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                          : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                      }`}
                    >
                      {patient.isActive ? "Active" : "Deactivated"}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500">
                  CareCircle Comprehensive Clinical & Family Overview
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold">Loading patient records...</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            ) : patient ? (
              <>
                {/* Clinical Metadata Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Age</div>
                    <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                      {calculateAge(patient.dob) ? `${calculateAge(patient.dob)} yrs` : "—"}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blood Type</div>
                    <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                      {patient.bloodType || "Unknown"}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</div>
                    <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                      {patient.gender || "—"}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DOB</div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                      {new Date(patient.dob).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Clinical Overview Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    <span>Health & Clinical Summary</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Primary Condition:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {patient.primaryCondition || "None recorded"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Known Allergies:</span>
                      <p className="font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                        {patient.allergies || "No allergies recorded"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Emergency Contact:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {patient.emergencyContact || "None"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Caregiver Relation String:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {patient.relationship || "Dependent"}
                      </p>
                    </div>
                  </div>
                  {patient.notes && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                      <span className="text-slate-400 font-medium">Caregiver Notes:</span>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5 italic">
                        "{patient.notes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Section 1: Linked Caregiver */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      <span>Assigned Primary Caregiver</span>
                    </h3>
                  </div>

                  {patient.caregiver ? (
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{patient.caregiver.name}</span>
                          <span
                            className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                              patient.caregiver.verificationStatus === "VERIFIED"
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {patient.caregiver.verificationStatus || "VERIFIED"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{patient.caregiver.email}</span>
                        </div>
                        {patient.caregiver.phone && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{patient.caregiver.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                      No primary caregiver is assigned to this patient.
                    </div>
                  )}
                </div>

                {/* Section 2: All Family Members with Badges */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Users className="w-4 h-4 text-violet-500" />
                      <span>Linked Family Members ({patient.familyMembers?.length || 0})</span>
                    </h3>
                  </div>

                  {!patient.familyMembers || patient.familyMembers.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
                      <Heart className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        No family members currently linked
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Add family members (Son, Daughter, Spouse, etc.) in the Family tab to grant read-only portal access.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {patient.familyMembers.map((fam: any) => (
                        <div
                          key={fam.id}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {fam.name}
                              </span>
                              {/* Relationship Badge */}
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                                {formatRelationship(fam.relationship, fam.relationshipOther, patient.name)}
                              </span>
                              {fam.isPrimaryContact && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                                  <Sparkles className="w-3 h-3 text-amber-500" />
                                  Primary Contact
                                </span>
                              )}
                              {!fam.isActive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
                                  Inactive
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                {fam.email}
                              </span>
                              {fam.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  {fam.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 3: Clinical Record Counts */}
                {patient._count && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Associated Health Records
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                        <Pill className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                        <div className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                          {patient._count.medications || 0}
                        </div>
                        <div className="text-[10px] text-slate-400">Medications</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                        <Calendar className="w-4 h-4 text-violet-500 mx-auto mb-1" />
                        <div className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                          {patient._count.appointments || 0}
                        </div>
                        <div className="text-[10px] text-slate-400">Doctor Visits</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                        <Activity className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                        <div className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                          {patient._count.symptomLogs || 0}
                        </div>
                        <div className="text-[10px] text-slate-400">Vitals/Logs</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                        <AlertCircle className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                        <div className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                          {patient._count.alerts || 0}
                        </div>
                        <div className="text-[10px] text-slate-400">Active Alerts</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
