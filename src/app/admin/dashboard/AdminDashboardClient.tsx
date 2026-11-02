"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  UserCheck,
  Heart,
  Clock,
  RefreshCw,
  AlertTriangle,
  UserX,
  UserPlus,
  FileText,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  History,
} from "lucide-react";
import { StatCard, StatusBadge, EmptyState } from "@/components/shared";

interface DashboardData {
  stats: {
    caregivers: number;
    activeCaregivers: number;
    patients: number;
    activePatients: number;
    familyMembers: number;
    pendingVerifications: number;
    inactiveUsers: number;
    escalatedAlerts: number;
    escalationHours: number;
  };
  pendingCaregivers: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    education: string | null;
    previousExperience: string | null;
    createdAt: string;
  }>;
  recentAuditLogs: Array<{
    id: string;
    actorType: string;
    action: string;
    targetType: string;
    summary: string;
    createdAt: string;
  }>;
}

export default function AdminDashboardClient({ adminName }: { adminName: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Enterprise System Oversight</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting}, {adminName}
            </h1>
            <p className="text-sm text-indigo-200/80 font-medium mt-0.5">
              {formattedDate}
            </p>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed pt-1">
            CareCircle administrative control center. Monitor system verifications, patient allocations, inactive accounts, and platform compliance.
          </p>

          {/* Quick Actions */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/users"
              className="px-3.5 py-2 rounded-xl bg-white text-slate-900 font-semibold text-xs hover:bg-slate-100 shadow transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>Add User</span>
            </Link>
            <Link
              href="/admin/verification"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/10 transition-all flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Review Pending</span>
              {data && data.stats.pendingVerifications > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                  {data.stats.pendingVerifications}
                </span>
              )}
            </Link>
            <Link
              href="/admin/patients"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/10 transition-all flex items-center gap-2"
            >
              <Heart className="w-4 h-4 text-teal-400" />
              <span>View Patients</span>
            </Link>
            <Link
              href="/admin/reports"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/10 transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>View Reports</span>
            </Link>
            <button
              onClick={fetchDashboardData}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors ml-auto"
              title="Refresh metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 6 Core Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <StatCard
          label="Caregivers"
          value={data ? data.stats.caregivers : 0}
          subtext={data ? `${data.stats.activeCaregivers} active` : "Loading..."}
          icon={UserCheck}
          variant="indigo"
          loading={loading}
        />
        <StatCard
          label="Patients"
          value={data ? data.stats.patients : 0}
          subtext={data ? `${data.stats.activePatients} active` : "Loading..."}
          icon={Heart}
          variant="teal"
          loading={loading}
        />
        <StatCard
          label="Family Members"
          value={data ? data.stats.familyMembers : 0}
          subtext="Linked contacts"
          icon={Users}
          variant="violet"
          loading={loading}
        />
        <StatCard
          label="Pending Queue"
          value={data ? data.stats.pendingVerifications : 0}
          subtext="Awaiting review"
          icon={Clock}
          variant="amber"
          loading={loading}
        />
        <StatCard
          label="Inactive Accounts"
          value={data ? data.stats.inactiveUsers : 0}
          subtext="Deactivated users"
          icon={UserX}
          variant={data && data.stats.inactiveUsers > 0 ? "rose" : "violet"}
          loading={loading}
        />
        <StatCard
          label="Escalated Alerts"
          value={data ? data.stats.escalatedAlerts : 0}
          subtext={data ? `>${data.stats.escalationHours}h unresolved` : "Loading..."}
          icon={AlertTriangle}
          variant={data && data.stats.escalatedAlerts > 0 ? "rose" : "violet"}
          loading={loading}
        />
      </div>

      {/* Main Grid: Verification Queue Preview & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Queue Preview */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Verification Queue Preview
                </h2>
                <p className="text-xs text-slate-500">
                  Caregivers awaiting identity and credentials review
                </p>
              </div>
            </div>
            <Link
              href="/admin/verification"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View all ({data?.stats.pendingVerifications || 0})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 py-2">
              <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
          ) : !data?.pendingCaregivers || data.pendingCaregivers.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={UserCheck}
                title="Queue is empty"
                description="All caregiver registrations have been reviewed. New applications will appear here."
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.pendingCaregivers.map((cg) => (
                <div
                  key={cg.id}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {cg.name}
                      </span>
                      <StatusBadge status="PENDING" />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {cg.email} {cg.education ? `• ${cg.education}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/admin/verification`}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors flex items-center gap-1"
                  >
                    <span>Review</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Log Preview */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Recent System Activity
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time audit log of administrative actions
                </p>
              </div>
            </div>
            <Link
              href="/admin/audit"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Full audit log</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 py-2">
              <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
          ) : !data?.recentAuditLogs || data.recentAuditLogs.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={History}
                title="No recent actions"
                description="Administrative audit entries will be recorded here automatically."
              />
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/30 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {log.action}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        {log.actorType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1">
                      {log.summary}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Intl.DateTimeFormat("en-US", {
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    }).format(new Date(log.createdAt))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
