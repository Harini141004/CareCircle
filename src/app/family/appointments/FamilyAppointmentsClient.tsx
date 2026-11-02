"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Calendar, Clock, MapPin, Stethoscope, CheckCircle2, Circle, FileText, CheckSquare } from "lucide-react";

interface ChecklistItem {
  id: string;
  task: string;
  isCompleted: boolean;
}

interface Appointment {
  id: string;
  doctorName: string;
  specialty?: string | null;
  location?: string | null;
  dateTime: string | Date;
  reason?: string | null;
  notes?: string | null;
  status: string;
  checklistItems: ChecklistItem[];
}

interface FamilyAppointmentsClientProps {
  patient: {
    id: string;
    name: string;
    caregiver?: { id: string; name: string; phone?: string | null } | null;
  };
  appointments: Appointment[];
}

export default function FamilyAppointmentsClient({
  patient,
  appointments,
}: FamilyAppointmentsClientProps) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const now = new Date();
  const upcoming = appointments.filter((a) => new Date(a.dateTime) >= now || a.status === "UPCOMING");
  const past = appointments.filter((a) => new Date(a.dateTime) < now && a.status !== "UPCOMING");

  const displayedAppointments = tab === "upcoming" ? upcoming : past;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Appointments for ${patient.name}`}
        description="View-only schedule of upcoming doctor visits, locations, clinical notes, and checklist preparation."
      />

      {/* Summary StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Upcoming Visits"
          value={upcoming.length}
          subtext="Scheduled consultations"
          icon={Calendar}
          variant="indigo"
        />
        <StatCard
          label="Past Records"
          value={past.length}
          subtext="Completed / historical visits"
          icon={Clock}
          variant="violet"
        />
        <StatCard
          label="Caregiver Escort"
          value={patient.caregiver?.name || "Unassigned"}
          subtext={patient.caregiver?.phone ? `Direct: ${patient.caregiver.phone}` : "Accompanies patient"}
          icon={Stethoscope}
          variant="emerald"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setTab("upcoming")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === "upcoming"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Upcoming Consultations ({upcoming.length})
        </button>
        <button
          onClick={() => setTab("past")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === "past"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Past Consultations ({past.length})
        </button>
      </div>

      {/* Appointment Cards */}
      {displayedAppointments.length === 0 ? (
        <EmptyState
          title={tab === "upcoming" ? "No Upcoming Appointments" : "No Past Appointments"}
          description={
            tab === "upcoming"
              ? "There are no medical appointments currently scheduled for your loved one."
              : "No past appointment history is recorded yet."
          }
          icon={Calendar}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedAppointments.map((apt) => {
            const dt = new Date(apt.dateTime);
            const dateStr = dt.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const timeStr = dt.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <div
                key={apt.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-indigo-500" />
                        <span>{apt.doctorName}</span>
                      </h3>
                      {apt.specialty && (
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {apt.specialty}
                        </p>
                      )}
                    </div>
                    <StatusBadge
                      status={apt.status === "COMPLETED" ? "success" : apt.status === "CANCELLED" ? "danger" : "info"}
                      label={apt.status}
                    />
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200" suppressHydrationWarning>
                        {dateStr} at {timeStr}
                      </span>
                    </div>
                    {apt.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{apt.location}</span>
                      </div>
                    )}
                    {apt.reason && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Reason: {apt.reason}</span>
                      </div>
                    )}
                  </div>

                  {apt.notes && (
                    <p className="text-xs text-slate-500 italic bg-slate-50/50 dark:bg-slate-800/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      "{apt.notes}"
                    </p>
                  )}

                  {/* Checklist Items (View-Only) */}
                  {apt.checklistItems && apt.checklistItems.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5" />
                          Visit Checklist
                        </span>
                        <span>
                          {apt.checklistItems.filter((i) => i.isCompleted).length} / {apt.checklistItems.length} Done
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {apt.checklistItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                          >
                            {item.isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                            )}
                            <span className={item.isCompleted ? "line-through text-slate-400" : ""}>
                              {item.task}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Read-only view • Managed by care team
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
