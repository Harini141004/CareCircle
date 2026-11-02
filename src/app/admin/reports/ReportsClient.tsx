"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Calendar,
  Users,
  CheckCircle2,
  TrendingUp,
  Heart,
  RefreshCw,
  Printer,
  ShieldCheck,
} from "lucide-react";
import {
  PageHeader,
  StatCard,
  StatusBadge,
  SkeletonCard,
  SkeletonTable,
} from "@/components/shared";

interface CaregiverMetric {
  id: string;
  name: string;
  email: string;
  verificationStatus: string;
  patientsCount: number;
  openAlertsCount: number;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  skippedDoses: number;
  adherenceRate: number;
}

interface PatientCoverage {
  totalPatients: number;
  withPrimaryContact: number;
  withAnyFamily: number;
  withoutFamily: number;
  unassignedPatients: number;
}

interface ReportData {
  periodDays: string;
  totalMedicationLogs: number;
  caregivers: CaregiverMetric[];
  patientCoverage: PatientCoverage;
}

export default function ReportsClient({ adminName: _adminName }: { adminName: string }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/reports?days=${days}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [days]);

  const handleExportCsv = () => {
    window.location.href = `/api/admin/reports?days=${days}&format=csv`;
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:p-0">
      <div className="print:hidden">
        <PageHeader
          title="Administrative Performance Reports"
          description="Cross-caregiver clinical adherence metrics, patient coverage completeness, and exportable regulatory reporting."
          badge="Analytics"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintPdf}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          }
        />
      </div>

      {/* Date Range Picker */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs print:hidden">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold">
          <Calendar className="w-4 h-4 text-indigo-500" />
          <span>Reporting Period:</span>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
          {[
            { id: "7", label: "Last 7 Days" },
            { id: "30", label: "Last 30 Days" },
            { id: "90", label: "Last 90 Days" },
            { id: "all", label: "All Time" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setDays(item.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                days === item.id
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coverage Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="Patient Coverage"
              value={`${data ? Math.round(((data.patientCoverage.totalPatients - data.patientCoverage.unassignedPatients) / (data.patientCoverage.totalPatients || 1)) * 100) : 100}%`}
              subtext={`${data?.patientCoverage.totalPatients || 0} active patients`}
              icon={Heart}
              variant="teal"
            />
            <StatCard
              label="Primary Contact Ratio"
              value={`${data ? Math.round((data.patientCoverage.withPrimaryContact / (data.patientCoverage.totalPatients || 1)) * 100) : 0}%`}
              subtext={`${data?.patientCoverage.withPrimaryContact || 0} with primary contact`}
              icon={Users}
              variant="indigo"
            />
            <StatCard
              label="Family Network"
              value={`${data?.patientCoverage.withAnyFamily || 0}`}
              subtext={`${data?.patientCoverage.withoutFamily || 0} without family`}
              icon={ShieldCheck}
              variant="violet"
            />
            <StatCard
              label="Scheduled Events"
              value={`${data?.totalMedicationLogs || 0}`}
              subtext={`Logged in past ${days === "all" ? "full history" : `${days} days`}`}
              icon={CheckCircle2}
              variant="emerald"
            />
          </>
        )}
      </div>

      {/* Caregiver Performance Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Caregiver Adherence & Performance
            </h2>
            <p className="text-xs text-slate-500">
              Medication adherence rates across assigned patient rosters
            </p>
          </div>

          <button
            onClick={fetchReports}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 print:hidden"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <SkeletonTable rows={3} />
        ) : !data?.caregivers || data.caregivers.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No caregiver performance records available for this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Caregiver</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Patients</th>
                  <th className="py-3 px-4 text-center">Doses Taken / Total</th>
                  <th className="py-3 px-4 text-center">Missed / Skipped</th>
                  <th className="py-3 px-4 text-right">Adherence Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.caregivers.map((cg) => (
                  <tr
                    key={cg.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {cg.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{cg.email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={cg.verificationStatus} />
                    </td>

                    <td className="py-3 px-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                      {cg.patientsCount}
                    </td>

                    <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                      {cg.takenDoses} / {cg.totalDoses}
                    </td>

                    <td className="py-3 px-4 text-center text-slate-500">
                      <span className="text-rose-600 font-semibold">{cg.missedDoses}</span> missed •{" "}
                      <span className="text-amber-600 font-semibold">{cg.skippedDoses}</span> skipped
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              cg.adherenceRate >= 90
                                ? "bg-teal-500"
                                : cg.adherenceRate >= 75
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${cg.adherenceRate}%` }}
                          />
                        </div>
                        <span
                          className={`font-bold ${
                            cg.adherenceRate >= 90
                              ? "text-teal-600 dark:text-teal-400"
                              : cg.adherenceRate >= 75
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {cg.adherenceRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
