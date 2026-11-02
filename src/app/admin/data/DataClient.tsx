"use client";

import { useEffect, useState } from "react";
import { PageHeader, SkeletonCard, EmptyState } from "@/components/shared";
import {
  Database,
  Download,
  HardDrive,
  FileSpreadsheet,
  Code,
  ShieldCheck,
  Users,
  FileText,
  Activity,
  Clock,
  RefreshCw,
  AlertCircle,
  Table,
  CheckCircle2,
} from "lucide-react";

interface DatabaseTelemetry {
  database: {
    engine: string;
    file: {
      exists: boolean;
      sizeBytes: number;
      sizeFormatted: string;
      lastModified: string | null;
      path: string | null;
    };
  };
  counts: {
    admins: number;
    caregivers: number;
    patients: number;
    familyMembers: number;
    medications: number;
    medicationLogs: number;
    symptomLogs: number;
    appointments: number;
    alerts: number;
    auditLogs: number;
    loginAttempts: number;
    conversations: number;
    messages: number;
    careNotes: number;
  };
  lastBackupDate: string | null;
}

export default function DataClient() {
  const [telemetry, setTelemetry] = useState<DatabaseTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/data");
      if (!res.ok) throw new Error("Failed to load database telemetry");
      const data = await res.json();
      setTelemetry(data);
    } catch (err: any) {
      setError(err.message || "Failed to load database telemetry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadBackup = () => {
    window.location.href = "/api/admin/data/backup";
  };

  const handleExport = (type: "users" | "audit" | "json") => {
    window.location.href = `/api/admin/data?export=${type}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Management & Database Backups"
        description="Export audit-ready records, download SQLite database snapshots, and monitor database storage statistics."
        actions={
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Telemetry
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <EmptyState
          icon={AlertCircle}
          title="Error loading database information"
          description={error}
          action={{
            label: "Try Again",
            onClick: fetchData,
          }}
        />
      ) : telemetry ? (
        <div className="space-y-6">
          {/* Card 1: SQLite Database Health & Backup */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    SQLite Database File
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Standalone transactional database stored locally at{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-teal-700 dark:bg-slate-800 dark:text-teal-300">
                      {telemetry.database.file.path || "dev.db"}
                    </code>
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownloadBackup}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <Download className="h-4 w-4" />
                Download SQLite Backup (.db)
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-medium text-slate-500">Storage Engine</span>
                <div className="mt-1 flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                  <HardDrive className="h-4 w-4 text-slate-400" />
                  {telemetry.database.engine}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500">File Size</span>
                <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {telemetry.database.file.sizeFormatted}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500">File Integrity</span>
                <div className="mt-1 flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {telemetry.database.file.exists ? "Healthy & Accessible" : "Missing"}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500">Last Write Timestamp</span>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {telemetry.database.file.lastModified
                    ? new Date(telemetry.database.file.lastModified).toLocaleString()
                    : "Unknown"}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Export Center */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
              Data Export Center
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Users CSV */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                    User Accounts Roster
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Export full registry of admins, caregivers, patients, and family members with contact numbers and roles.
                  </p>
                </div>
                <button
                  onClick={() => handleExport("users")}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-teal-600" />
                  Export CSV
                </button>
              </div>

              {/* Reports CSV */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                    Adherence Reports
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Export caregiver adherence metrics, dose taking percentages, and patient family coverage stats.
                  </p>
                </div>
                <button
                  onClick={() => {
                    window.location.href = "/api/admin/reports?format=csv";
                  }}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-teal-600" />
                  Export CSV
                </button>
              </div>

              {/* Audit Log CSV */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                    Audit Trail CSV
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Export compliance audit logs recording administrative modifications, logins, and drawer inspections.
                  </p>
                </div>
                <button
                  onClick={() => handleExport("audit")}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-teal-600" />
                  Export CSV
                </button>
              </div>

              {/* JSON Snapshot */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400">
                    <Code className="h-4 w-4" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                    System JSON Snapshot
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Machine-readable JSON extract of all database tables (sanitized of password credentials).
                  </p>
                </div>
                <button
                  onClick={() => handleExport("json")}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Code className="h-3.5 w-3.5 text-purple-600" />
                  Download JSON
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Storage Table Telemetry */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Table className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Database Table Record Census
                </h3>
                <p className="text-xs text-slate-500">
                  Total record count per relational entity in SQLite storage.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
              {[
                { label: "Admins", count: telemetry.counts.admins },
                { label: "Caregivers", count: telemetry.counts.caregivers },
                { label: "Patients", count: telemetry.counts.patients },
                { label: "Family", count: telemetry.counts.familyMembers },
                { label: "Medications", count: telemetry.counts.medications },
                { label: "Dose Logs", count: telemetry.counts.medicationLogs },
                { label: "Vitals Logs", count: telemetry.counts.symptomLogs },
                { label: "Appointments", count: telemetry.counts.appointments },
                { label: "Alerts", count: telemetry.counts.alerts },
                { label: "Audit Logs", count: telemetry.counts.auditLogs },
                { label: "Login Events", count: telemetry.counts.loginAttempts },
                { label: "Conversations", count: telemetry.counts.conversations },
                { label: "Messages", count: telemetry.counts.messages },
                { label: "Care Notes", count: telemetry.counts.careNotes },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50"
                >
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {item.count}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
