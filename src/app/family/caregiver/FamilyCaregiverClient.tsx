"use client";

import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ShieldCheck,
  Phone,
  Mail,
  GraduationCap,
  Briefcase,
  FileSignature,
  MessageSquare,
  Clock,
  Calendar,
  AlertCircle,
} from "lucide-react";

interface Caregiver {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  education?: string | null;
  previousExperience?: string | null;
  verificationStatus: string;
  createdAt: string | Date;
}

interface CareNote {
  id: string;
  type: string;
  body: string;
  createdAt: string | Date;
}

interface FamilyCaregiverClientProps {
  patient: {
    id: string;
    name: string;
  };
  caregiver?: Caregiver | null;
  shiftNotes: CareNote[];
}

export default function FamilyCaregiverClient({
  patient,
  caregiver,
  shiftNotes,
}: FamilyCaregiverClientProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Care Team for ${patient.name}`}
        description="Assigned primary caregiver credentials, direct contact details, and shift notes from the last 7 days."
        actions={
          caregiver ? (
            <Link
              href="/family/messages"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send Message</span>
            </Link>
          ) : undefined
        }
      />

      {/* Caregiver Card */}
      {caregiver ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/20">
                {caregiver.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {caregiver.name}
                  </h2>
                  <StatusBadge
                    status={caregiver.verificationStatus === "VERIFIED" ? "success" : "info"}
                    label="Verified Professional"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Designated Primary Caregiver for {patient.name}
                </p>
              </div>
            </div>

            {/* Direct Contact Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              {caregiver.phone && (
                <a
                  href={`tel:${caregiver.phone}`}
                  className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-colors"
                >
                  <Phone className="w-4 h-4 text-indigo-500" />
                  <span>{caregiver.phone}</span>
                </a>
              )}
              <a
                href={`mailto:${caregiver.email}`}
                className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-colors"
              >
                <Mail className="w-4 h-4 text-indigo-500" />
                <span>{caregiver.email}</span>
              </a>
            </div>
          </div>

          {/* Qualifications & Experience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                <span>Education & Credentials</span>
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                {caregiver.education || "Certified Nursing Assistant / Home Health Aide"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                <span>Clinical Experience</span>
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                {caregiver.previousExperience || "Experienced in elderly care, vital signs monitoring & mobility support"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Caregiver Assigned
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            An administrator has not yet assigned a primary caregiver to your loved one.
          </p>
        </div>
      )}

      {/* Shift Notes (Last 7 Days) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Shift Notes & Observations (Last 7 Days)
            </h2>
          </div>
          <span className="text-xs text-slate-500">{shiftNotes.length} notes posted</span>
        </div>

        {shiftNotes.length === 0 ? (
          <EmptyState
            title="No Shift Notes in the Last 7 Days"
            description="The caregiver has not posted recent shift handovers or notes yet."
            icon={FileSignature}
          />
        ) : (
          <div className="space-y-3">
            {shiftNotes.map((note) => {
              const dt = new Date(note.createdAt);
              const dateStr = dt.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const timeStr = dt.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <div
                  key={note.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200" suppressHydrationWarning>
                        {dateStr} at {timeStr}
                      </span>
                    </div>
                    <StatusBadge
                      status={note.type === "HANDOVER" ? "warning" : "info"}
                      label={note.type === "HANDOVER" ? "Handover Note" : "Shift Note"}
                    />
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/60 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    {note.body}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
