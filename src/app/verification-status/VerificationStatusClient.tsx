"use client";

import Link from "next/link";
import { Clock, AlertTriangle, ShieldCheck, User, ArrowRight, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/shared";

interface VerificationStatusClientProps {
  status: string;
  rejectionReason?: string | null;
  userName: string;
}

export default function VerificationStatusClient({
  status,
  rejectionReason,
  userName,
}: VerificationStatusClientProps) {
  const isPending = status === "PENDING";
  const isRejected = status === "REJECTED";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          {/* Status Icon */}
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
              isPending
                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                : isRejected
                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
                : "bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400"
            }`}
          >
            {isPending ? (
              <Clock className="h-8 w-8 animate-pulse" />
            ) : isRejected ? (
              <AlertTriangle className="h-8 w-8" />
            ) : (
              <ShieldCheck className="h-8 w-8" />
            )}
          </div>

          <div className="mt-4">
            <StatusBadge
              status={status}
              label={
                isPending
                  ? "Awaiting Admin Review"
                  : isRejected
                  ? "Application Rejected"
                  : "Verified Caregiver"
              }
            />
          </div>

          <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
            {isPending
              ? "Your Application Is Under Review"
              : isRejected
              ? "Credential Verification Unsuccessful"
              : "Account Verified"}
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {isPending
              ? `Hello ${userName}, your registration as a healthcare caregiver is currently being reviewed by the CareCircle compliance team. We verify medical education, certifications, and previous clinical experience before assigning patients.`
              : isRejected
              ? `Hello ${userName}, the CareCircle administrative team was unable to verify your clinical credentials.`
              : "Your account has been verified. You may proceed to your daily dashboard."}
          </p>

          {/* Rejection Reason Notice */}
          {isRejected && rejectionReason && (
            <div className="mt-6 w-full rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-left dark:border-rose-900/50 dark:bg-rose-950/30">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4" />
                Reason Provided by Administrator:
              </div>
              <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">
                "{rejectionReason}"
              </p>
            </div>
          )}

          {/* Guidance Card */}
          <div className="mt-6 w-full rounded-2xl bg-slate-50 p-4 text-left dark:bg-slate-800/50">
            <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              What can you do now?
            </h2>
            <ul className="mt-2 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="font-bold text-teal-600">•</span>
                <span>
                  You can access and update your professional qualifications, education details, and contact information on your Profile.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-teal-600">•</span>
                <span>
                  Once verified, clinical features (patient charts, medication tracking, vitals logs, and care notes) will activate automatically.
                </span>
              </li>
            </ul>
          </div>

          {/* Action Links */}
          <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row">
            <Link
              href="/profile"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              <User className="h-4 w-4" />
              Manage Profile
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Check Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
