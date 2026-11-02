"use client";

import { useEffect, useState, useTransition } from "react";
import {
  PageHeader,
  StatCard,
  StatusBadge,
  EmptyState,
  SkeletonCard,
  SkeletonTable,
  ConfirmDialog,
} from "@/components/shared";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Download,
  RefreshCw,
  Award,
  Calendar,
  AlertCircle,
  FileCheck,
  Check,
} from "lucide-react";

interface PayrollRecord {
  id: string;
  caregiverId: string;
  caregiverName: string;
  caregiverEmail: string;
  phone?: string | null;
  verificationStatus: string;
  isActive: boolean;
  period: string;
  patientsCount: number;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  adherenceRate: number;
  bonusTier: string;
  basePay: number;
  adherenceBonus: number;
  totalPay: number;
  status: "PENDING" | "APPROVED" | "PAID";
  approvedAt?: string | null;
  approvedBy?: string | null;
  paidAt?: string | null;
  paidBy?: string | null;
  notes?: string | null;
  updatedAt: string;
}

interface PayrollSummary {
  period: string;
  totalCaregivers: number;
  totalPayout: number;
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  paidCount: number;
  paidAmount: number;
}

export default function PayrollClient() {
  const [period, setPeriod] = useState<string>(() => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Confirm state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    record: PayrollRecord | null;
    targetStatus: "APPROVED" | "PAID";
  }>({
    isOpen: false,
    record: null,
    targetStatus: "APPROVED",
  });
  const [notesInput, setNotesInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/payroll?period=${period}&status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to load payroll records");
      const data = await res.json();
      setRecords(data.records || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [period, statusFilter]);

  const handleUpdateStatus = async () => {
    if (!confirmModal.record) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/payroll", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caregiverId: confirmModal.record?.caregiverId,
            period,
            status: confirmModal.targetStatus,
            notes: notesInput.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update payroll status");
        }

        setConfirmModal({ isOpen: false, record: null, targetStatus: "APPROVED" });
        setNotesInput("");
        await fetchPayroll();
      } catch (err: any) {
        alert(err.message || "Failed to update payroll");
      }
    });
  };

  const handleExportCsv = () => {
    window.location.href = `/api/admin/payroll?period=${period}&status=${statusFilter}&format=csv`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caregiver Payroll & Compensation"
        description="Performance-based compensation modeling, medication adherence bonuses, and payroll disbursement."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Calendar className="h-4 w-4 text-slate-400" />
              <label htmlFor="period-select" className="font-medium text-slate-500">
                Period:
              </label>
              <input
                id="period-select"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-transparent font-semibold text-slate-900 focus:outline-none dark:text-white"
              />
            </div>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>

            <button
              onClick={fetchPayroll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      {loading && !summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Payroll Liability"
            value={`$${(summary?.totalPayout || 0).toLocaleString()}`}
            subtext={`${summary?.totalCaregivers || 0} active caregivers in ${period}`}
            icon={DollarSign}
            variant="teal"
          />
          <StatCard
            label="Pending Review"
            value={`$${(summary?.pendingAmount || 0).toLocaleString()}`}
            subtext={`${summary?.pendingCount || 0} caregivers awaiting approval`}
            icon={Clock}
            variant="amber"
          />
          <StatCard
            label="Approved for Payout"
            value={`$${(summary?.approvedAmount || 0).toLocaleString()}`}
            subtext={`${summary?.approvedCount || 0} approved, pending disbursement`}
            icon={FileCheck}
            variant="indigo"
          />
          <StatCard
            label="Disbursed & Paid"
            value={`$${(summary?.paidAmount || 0).toLocaleString()}`}
            subtext={`${summary?.paidCount || 0} settlements finalized`}
            icon={CheckCircle2}
            variant="emerald"
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {["ALL", "PENDING", "APPROVED", "PAID"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === st
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {st === "ALL" ? "All Statuses" : st}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Formula: <span className="font-semibold text-slate-700 dark:text-slate-300">$1,500 base</span> +{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">$300/patient</span> +{" "}
          <span className="font-semibold text-teal-600 dark:text-teal-400">Adherence Bonus</span> (up to $300)
        </p>
      </div>

      {/* Main Content */}
      {loading ? (
        <SkeletonTable rows={4} cols={6} />
      ) : error ? (
        <EmptyState
          icon={AlertCircle}
          title="Error loading payroll records"
          description={error}
          action={{
            label: "Try Again",
            onClick: fetchPayroll,
          }}
        />
      ) : records.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No payroll records found"
          description={`No caregivers found matching the filter criteria for period ${period}.`}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Caregiver</th>
                  <th className="px-4 py-3">Patients</th>
                  <th className="px-4 py-3">Adherence Performance</th>
                  <th className="px-4 py-3">Base Pay</th>
                  <th className="px-4 py-3">Adherence Bonus</th>
                  <th className="px-4 py-3">Total Compensation</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-white">{r.caregiverName}</div>
                      <div className="text-[11px] text-slate-500">{r.caregiverEmail}</div>
                      {r.phone && <div className="text-[10px] text-slate-400">{r.phone}</div>}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        {r.patientsCount} {r.patientsCount === 1 ? "patient" : "patients"}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{r.adherenceRate}%</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full ${
                              r.adherenceRate >= 95
                                ? "bg-emerald-500"
                                : r.adherenceRate >= 85
                                ? "bg-teal-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${r.adherenceRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                        <Award className="h-3 w-3 text-amber-500" />
                        {r.bonusTier}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                      ${r.basePay.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        +${r.adherenceBonus}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        ${r.totalPay.toLocaleString()}
                      </div>
                      {r.notes && (
                        <div className="mt-0.5 text-[10px] text-slate-400 italic">
                          "{r.notes}"
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge
                        status={r.status}
                        label={
                          r.status === "PAID"
                            ? "Paid"
                            : r.status === "APPROVED"
                            ? "Approved"
                            : "Pending Review"
                        }
                      />
                      {r.paidAt && (
                        <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400" suppressHydrationWarning>
                          Paid: {new Date(r.paidAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "PENDING" && (
                          <button
                            onClick={() => {
                              setNotesInput(r.notes || "");
                              setConfirmModal({
                                isOpen: true,
                                record: r,
                                targetStatus: "APPROVED",
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </button>
                        )}

                        {r.status === "APPROVED" && (
                          <button
                            onClick={() => {
                              setNotesInput(r.notes || "");
                              setConfirmModal({
                                isOpen: true,
                                record: r,
                                targetStatus: "PAID",
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Mark Paid
                          </button>
                        )}

                        {r.status === "PAID" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Settled
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Approval or Disbursement */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        onCancel={() => setConfirmModal({ isOpen: false, record: null, targetStatus: "APPROVED" })}
        onConfirm={handleUpdateStatus}
        title={
          confirmModal.targetStatus === "PAID"
            ? `Disburse Payment ($${confirmModal.record?.totalPay.toLocaleString()})`
            : `Approve Payroll ($${confirmModal.record?.totalPay.toLocaleString()})`
        }
        description={`Are you sure you want to mark the ${period} payroll for caregiver "${confirmModal.record?.caregiverName}" as ${confirmModal.targetStatus}?`}
        confirmLabel={confirmModal.targetStatus === "PAID" ? "Mark as Paid" : "Approve Payout"}
        loading={isPending}
      />
    </div>
  );
}
