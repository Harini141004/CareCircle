"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  GraduationCap,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  X,
} from "lucide-react";
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  SkeletonTable,
  ConfirmDialog,
} from "@/components/shared";

interface CaregiverItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  education: string | null;
  previousExperience: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    patients: number;
  };
}

export default function VerificationClient({ adminName: _adminName }: { adminName: string }) {
  const [caregivers, setCaregivers] = useState<CaregiverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [selectedCaregiver, setSelectedCaregiver] = useState<CaregiverItem | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchCaregivers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/verification?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setCaregivers(data.caregivers || []);
      }
    } catch (err) {
      console.error("Failed to load verification queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaregivers();
  }, [statusFilter]);

  const handleVerify = async () => {
    if (!selectedCaregiver) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caregiverId: selectedCaregiver.id,
          status: "VERIFIED",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: `${selectedCaregiver.name} has been verified.` });
        setIsVerifyDialogOpen(false);
        setSelectedCaregiver(null);
        await fetchCaregivers();
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to verify caregiver" });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedCaregiver) return;
    if (!rejectReason.trim()) {
      setRejectError("A rejection reason is required so the caregiver knows what needs correction.");
      return;
    }

    try {
      setSubmitting(true);
      setRejectError("");
      const res = await fetch("/api/admin/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caregiverId: selectedCaregiver.id,
          status: "REJECTED",
          reason: rejectReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({
          type: "success",
          text: `${selectedCaregiver.name} was marked as rejected with reason noted.`,
        });
        setIsRejectModalOpen(false);
        setSelectedCaregiver(null);
        setRejectReason("");
        await fetchCaregivers();
      } else {
        setRejectError(data.error || "Failed to reject caregiver");
      }
    } catch {
      setRejectError("Network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCaregivers = caregivers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.education && c.education.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caregiver Verification Queue"
        description="Verify credentials, medical education, and clinical background of newly registered caregivers before patient assignment."
        badge="Compliance"
        actions={
          <button
            onClick={fetchCaregivers}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-xs font-semibold shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Notification Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
            actionMessage.type === "success"
              ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 w-fit">
          {[
            { id: "PENDING", label: "Pending", icon: Clock },
            { id: "VERIFIED", label: "Verified", icon: CheckCircle2 },
            { id: "REJECTED", label: "Rejected", icon: XCircle },
            { id: "ALL", label: "All Caregivers", icon: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, credentials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>
      </div>

      {/* Queue Content */}
      {loading ? (
        <SkeletonTable rows={4} />
      ) : filteredCaregivers.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title={
            statusFilter === "PENDING"
              ? "No Pending Verifications"
              : "No Caregivers Match Filter"
          }
          description={
            statusFilter === "PENDING"
              ? "All registered caregivers have been reviewed. Outstanding applications will appear here automatically."
              : "Try switching filters or clearing your search criteria."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCaregivers.map((cg) => (
            <div
              key={cg.id}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {cg.name}
                      </h3>
                      <StatusBadge status={cg.verificationStatus} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {cg.email}
                      </span>
                      {cg.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {cg.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
                      new Date(cg.createdAt)
                    )}
                  </span>
                </div>

                {/* Education / Qualifications */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Education & Certifications:
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                        {cg.education || "No medical certifications entered"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <Briefcase className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Clinical Experience:
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                        {cg.previousExperience || "No prior background specified"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rejection reason banner if rejected */}
                {cg.verificationStatus === "REJECTED" && cg.rejectionReason && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Rejection Note
                    </span>
                    <p className="text-[11px] leading-relaxed">{cg.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  Assigned Patients: {cg._count.patients}
                </span>

                <div className="flex items-center gap-2">
                  {cg.verificationStatus !== "VERIFIED" && (
                    <button
                      onClick={() => {
                        setSelectedCaregiver(cg);
                        setIsVerifyDialogOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Verify</span>
                    </button>
                  )}

                  {cg.verificationStatus !== "REJECTED" && (
                    <button
                      onClick={() => {
                        setSelectedCaregiver(cg);
                        setRejectReason(cg.rejectionReason || "");
                        setRejectError("");
                        setIsRejectModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 font-semibold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verify Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isVerifyDialogOpen}
        onCancel={() => setIsVerifyDialogOpen(false)}
        onConfirm={handleVerify}
        title={`Verify Caregiver: ${selectedCaregiver?.name}`}
        description={`Are you sure you want to approve ${selectedCaregiver?.name} as a VERIFIED caregiver? They will immediately be eligible to take on patient assignments.`}
        confirmLabel="Confirm Verification"
        loading={submitting}
      />

      {/* Reject Reason Modal */}
      {isRejectModalOpen && selectedCaregiver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Reject Caregiver Application
                  </h3>
                  <p className="text-xs text-slate-500">{selectedCaregiver.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Provide a clear reason for rejecting this caregiver. This message will be saved to their account record and made visible on their profile.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Incomplete nursing license verification; please re-upload your current CPR certificate."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              {rejectError && <p className="text-[11px] text-rose-600">{rejectError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
