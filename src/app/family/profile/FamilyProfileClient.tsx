"use client";

import React from "react";
import Link from "next/link";
import {
  Heart,
  ShieldCheck,
  User,
  Phone,
  Mail,
  Calendar,
  Pill,
  Activity,
  FileText,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  AlertCircle,
} from "lucide-react";

interface PeaceOfMindSummary {
  lastCheckIn: string;
  todayAdherence: string;
  adherenceSubtitle: string;
  nextEvent: string;
  caregiverOnDuty: string;
  caregiverPhone?: string | null;
}

interface FamilyProfileClientProps {
  familyMember: any;
  peaceOfMind?: PeaceOfMindSummary;
}

export default function FamilyProfileClient({
  familyMember,
  peaceOfMind,
}: FamilyProfileClientProps) {
  const patient = familyMember.patient;

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    const ageDt = new Date(diff);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const relationshipTitle =
    familyMember.relationship === "OTHER"
      ? familyMember.relationshipOther || "Other"
      : familyMember.relationship.charAt(0) + familyMember.relationship.slice(1).toLowerCase();

  return (
    <div className="space-y-6">
      {/* Header Profile Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-violet-800/60">
        <div className="absolute right-0 top-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-violet-950/50">
              {familyMember.name.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {familyMember.name}
                </h1>
                {/* Relationship Badge */}
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-400/20 border border-violet-400/40 text-violet-200">
                  {relationshipTitle} of {patient?.name || "Patient"}
                </span>
                {familyMember.isPrimaryContact && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Primary Contact
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-violet-400" />
                  {familyMember.email}
                </span>
                {familyMember.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-violet-400" />
                    {familyMember.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <Link
              href="/reports"
              className="px-4 py-2.5 rounded-xl bg-white text-violet-900 hover:bg-violet-50 font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-violet-600" />
              <span>Download Doctor Report</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Peace-of-Mind Live Health Summary */}
      {patient && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Last Check-in</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {peaceOfMind?.lastCheckIn || "Active"}
              </div>
              <div className="text-[11px] text-slate-500 truncate">Recent care log or vitals</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Adherence</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                {peaceOfMind?.todayAdherence || "100%"}
              </div>
              <div className="text-[11px] text-slate-500 truncate">{peaceOfMind?.adherenceSubtitle || "Medications on track"}</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Next Scheduled Event</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {peaceOfMind?.nextEvent || "No visits scheduled"}
              </div>
              <div className="text-[11px] text-slate-500 truncate">Upcoming visit / appointment</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Caregiver on Duty</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {peaceOfMind?.caregiverOnDuty || "Assigned"}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {peaceOfMind?.caregiverPhone ? `Call: ${peaceOfMind.caregiverPhone}` : "Primary Coordinator"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Linked Patient & Caregiver Overview */}
      {patient ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Card */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-base font-bold shadow-sm"
                  style={{ backgroundColor: patient.avatarColor || "#0D9488" }}
                >
                  {patient.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {patient.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your Linked Family Member Profile
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                Active Care Scope
              </span>
            </div>

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
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Condition</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                  {patient.primaryCondition || "None recorded"}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Known Allergies:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {patient.allergies || "No allergies documented"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Emergency Contact:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {patient.emergencyContact || "None"}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Caregiver Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Primary Caregiver
                  </h3>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {patient.caregiver?.name || "Unassigned"}
                  </div>
                </div>
              </div>

              {patient.caregiver && (
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{patient.caregiver.email}</span>
                  </div>
                  {patient.caregiver.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{patient.caregiver.phone}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
              Your loved one is under active coordination with their designated caregiver. You have read-only access to their medication schedules and appointment records.
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Patient Linked
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Please ask an administrator to link your account to a patient profile.
          </p>
        </div>
      )}

      {/* Read-Only Health Schedules */}
      {patient && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Medications */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Pill className="w-4 h-4 text-indigo-500" />
                <span>Active Prescriptions ({patient.medications?.length || 0})</span>
              </h3>
              <Link
                href="/medications"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Full List</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {!patient.medications || patient.medications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 italic">
                No active medications recorded for this patient.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {patient.medications.map((m: any) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{m.name}</div>
                      <div className="text-[11px] text-slate-400">{m.dosage} • {m.frequency}</div>
                    </div>
                    {m.instructions && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {m.instructions}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Doctor Visits */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-500" />
                <span>Upcoming Appointments ({patient.appointments?.length || 0})</span>
              </h3>
              <Link
                href="/appointments"
                className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
              >
                <span>Full Calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {!patient.appointments || patient.appointments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 italic">
                No upcoming appointments scheduled.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {patient.appointments.map((a: any) => (
                  <div key={a.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {a.doctorName}
                      </div>
                      <div className="text-[11px] text-violet-600 dark:text-violet-400 font-medium">
                        {a.specialty || "General Visit"}
                      </div>
                      {a.location && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{a.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-700 dark:text-slate-300" suppressHydrationWarning>
                        {new Date(a.dateTime).toLocaleDateString("en-US", {
                          month: "numeric",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400" suppressHydrationWarning>
                        {new Date(a.dateTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
