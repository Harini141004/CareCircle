"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  AlertCircle,
  Users,
  ShieldCheck,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, EmptyState, SkeletonDetail } from "@/components/shared";

interface CurrentPayrollRecord {
  id: string;
  period: string;
  status: "PENDING" | "APPROVED" | "PAID";
  patientsCount: number;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  adherenceRate: number;
  bonusTier: string;
  basePay: number;
  adherenceBonus: number;
  totalPay: number;
  approvedAt?: string | null;
  paidAt?: string | null;
  notes?: string | null;
}

export default function CaregiverPayrollClient() {
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const [record, setRecord] = useState<CurrentPayrollRecord | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayroll() {
      try {
        setLoading(true);
        const res = await fetch(`/api/payroll?period=${period}`);
        if (res.ok) {
          const data = await res.json();
          setRecord(data.currentPeriodRecord);
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error("Failed to load payroll:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPayroll();
  }, [period]);

  const periodsList = [
    "2026-10",
    "2026-09",
    "2026-08",
    "2026-07",
    "2026-06",
  ];

  if (loading) {
    return <SkeletonDetail />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compensation & Monthly Payroll"
        description="Transparent breakdown of your monthly caregiving stipend, patient coverage base pay, and medication adherence performance bonuses."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Pay Period:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {periodsList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {record && (
        <>
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total Compensation"
              value={`$${record.totalPay.toLocaleString()}`}
              subtext="Period estimated payout"
              variant="teal"
              icon={DollarSign}
            />
            <StatCard
              label="Adherence Rate"
              value={`${record.adherenceRate}%`}
              subtext={record.bonusTier}
              variant="indigo"
              icon={Award}
            />
            <StatCard
              label="Active Patients"
              value={record.patientsCount}
              subtext={`+$${record.patientsCount * 300} coverage add-on`}
              variant="violet"
              icon={Users}
            />
            <StatCard
              label="Disbursement Status"
              value={record.status}
              subtext={
                record.status === "PAID"
                  ? "Transferred to direct deposit"
                  : record.status === "APPROVED"
                  ? "Approved by Admin"
                  : "Pending period review"
              }
              variant={
                record.status === "PAID"
                  ? "emerald"
                  : record.status === "APPROVED"
                  ? "indigo"
                  : "amber"
              }
              icon={Clock}
            />
          </div>

          {/* Current Period Breakdown Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pay Period Details
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Period: {record.period}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    record.status === "PAID"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : record.status === "APPROVED"
                      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}
                >
                  {record.status}
                </span>
              </div>
            </div>

            {/* Compensation Formula Rows */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Base Caregiver Retainer
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Fixed monthly allowance + ${300} per assigned patient ({record.patientsCount} patients)
                  </span>
                </div>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  ${record.basePay.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900">
                <div>
                  <span className="font-bold text-teal-900 dark:text-teal-200 block">
                    Adherence Quality Incentive
                  </span>
                  <span className="text-teal-700 dark:text-teal-400 text-[11px]">
                    {record.adherenceRate}% adherence ({record.takenDoses}/{record.totalDoses} doses on time) • {record.bonusTier}
                  </span>
                </div>
                <span className="font-extrabold text-sm text-teal-700 dark:text-teal-300">
                  +${record.adherenceBonus}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white">
                <div>
                  <span className="font-black text-sm block">Total Net Compensation</span>
                  <span className="text-slate-400 text-[11px]">
                    Total earnings scheduled for disbursement
                  </span>
                </div>
                <span className="font-black text-xl text-teal-400">
                  ${record.totalPay.toLocaleString()}
                </span>
              </div>
            </div>

            {record.notes && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-bold block text-slate-400 text-[10px] uppercase mb-1">
                  Administrative Note:
                </span>
                {record.notes}
              </div>
            )}
          </div>
        </>
      )}

      {/* Historical Records Table */}
      {history.length > 0 && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Disbursement History & Past Statements
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Base Pay</th>
                  <th className="py-3 px-4">Incentive Bonus</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Disbursement Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{h.period}</td>
                    <td className="py-3 px-4">${h.basePay}</td>
                    <td className="py-3 px-4 text-teal-600 font-semibold">+${h.adherenceBonus}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">${h.totalPay}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        {h.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400" suppressHydrationWarning>
                      {h.paidAt ? new Date(h.paidAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) : "Pending"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
