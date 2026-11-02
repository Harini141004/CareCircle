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
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  LogOut,
  RefreshCw,
  Search,
  Filter,
  Users,
  AlertCircle,
  Key,
  Globe,
  Clock,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "ADMIN" | "CARETAKER" | "FAMILY";
  isActive: boolean;
  tokenVersion: number;
  lastLoginAt?: string | null;
  createdAt: string;
}

interface LoginAttempt {
  id: string;
  email: string;
  ip?: string | null;
  success: boolean;
  createdAt: string;
}

interface SecuritySummary {
  failed24hCount: number;
  success24hCount: number;
  inactiveUsersCount: number;
  totalUsersCount: number;
}

export default function SecurityClient() {
  const [activeTab, setActiveTab] = useState<"users" | "attempts">("users");
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for users
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [failedOnly, setFailedOnly] = useState(false);

  // Dialog actions
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: "force_logout" | "toggle_status";
    user: UserItem | null;
  }>({
    isOpen: false,
    type: "force_logout",
    user: null,
  });

  const [isPending, startTransition] = useTransition();

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/security");
      if (!res.ok) throw new Error("Failed to load security telemetry");
      const data = await res.json();
      setSummary(data.summary || null);
      setUsers(data.users || []);
      setAttempts(data.loginAttempts || []);
    } catch (err: any) {
      setError(err.message || "Failed to load security data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleConfirmAction = async () => {
    if (!dialogState.user) return;

    startTransition(async () => {
      try {
        let payload: any = {};
        if (dialogState.type === "force_logout") {
          payload = {
            action: "force_logout",
            userType: dialogState.user?.role,
            userId: dialogState.user?.id,
          };
        } else {
          payload = {
            action: "toggle_status",
            userType: dialogState.user?.role,
            userId: dialogState.user?.id,
            isActive: !dialogState.user?.isActive,
          };
        }

        const res = await fetch("/api/admin/security", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Action failed");
        }

        setDialogState({ isOpen: false, type: "force_logout", user: null });
        await fetchSecurityData();
      } catch (err: any) {
        alert(err.message || "Action failed");
      }
    });
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const filteredAttempts = attempts.filter((a) => {
    if (failedOnly && a.success) return false;
    if (!searchQuery) return true;
    return a.email.toLowerCase().includes(searchQuery.toLowerCase()) || (a.ip || "").includes(searchQuery);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Access Control"
        description="Monitor authentication attempts, revoke active user sessions with tokenVersion, and manage locked accounts."
        actions={
          <button
            onClick={fetchSecurityData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Telemetry
          </button>
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
            label="Failed Logins (24h)"
            value={summary?.failed24hCount ?? 0}
            subtext="Rejected invalid attempts"
            icon={AlertTriangle}
            variant={summary && summary.failed24hCount > 0 ? "rose" : "teal"}
          />
          <StatCard
            label="Successful Logins (24h)"
            value={summary?.success24hCount ?? 0}
            subtext="Legitimate authenticated sessions"
            icon={CheckCircle2}
            variant="emerald"
          />
          <StatCard
            label="Locked / Inactive Accounts"
            value={summary?.inactiveUsersCount ?? 0}
            subtext="Accounts barred from login"
            icon={Lock}
            variant={summary && summary.inactiveUsersCount > 0 ? "amber" : "indigo"}
          />
          <StatCard
            label="Session Integrity"
            value="Active"
            subtext="Jose HS256 JWT + Token Revocation"
            icon={ShieldCheck}
            variant="teal"
          />
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "users"
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Active Users & Token Revocation ({users.length})
          </button>

          <button
            onClick={() => setActiveTab("attempts")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "attempts"
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Authentication Audit Log ({attempts.length})
          </button>
        </div>

        {/* Global Search Input */}
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === "users" ? "Search users by name/email..." : "Search by email or IP..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* TAB 1: USERS & TOKEN VERSION REVOCATION */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Role filter:</span>
            {["ALL", "ADMIN", "CARETAKER", "FAMILY"].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  roleFilter === role
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {role === "ALL" ? "All Roles" : role === "CARETAKER" ? "Caregiver" : role}
              </button>
            ))}
          </div>

          {loading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : error ? (
            <EmptyState
              icon={AlertCircle}
              title="Error loading users"
              description={error}
              action={{
                label: "Try Again",
                onClick: fetchSecurityData,
              }}
            />
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users match filters"
              description="No user accounts matched your search or role selection."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Account Status</th>
                      <th className="px-4 py-3">Token Version</th>
                      <th className="px-4 py-3">Last Login</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUsers.map((u) => (
                      <tr key={`${u.role}_${u.id}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white">{u.name}</div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                          {u.phone && <div className="text-[10px] text-slate-400">{u.phone}</div>}
                        </td>

                        <td className="px-4 py-3.5">
                          <StatusBadge
                            status={u.role}
                            label={
                              u.role === "ADMIN"
                                ? "Admin"
                                : u.role === "CARETAKER"
                                ? "Caregiver"
                                : "Family"
                            }
                          />
                        </td>

                        <td className="px-4 py-3.5">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                              <Lock className="h-3 w-3 text-rose-500" />
                              Locked
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Key className="h-3.5 w-3.5 text-slate-400" />
                            v{u.tokenVersion}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {u.tokenVersion === 0 ? "Initial" : `${u.tokenVersion} session resets`}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                          {u.lastLoginAt ? (
                            <div suppressHydrationWarning>
                              <div>{new Date(u.lastLoginAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}</div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(u.lastLoginAt).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Never</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Force Logout Action */}
                            <button
                              onClick={() =>
                                setDialogState({
                                  isOpen: true,
                                  type: "force_logout",
                                  user: u,
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                              title="Revoke all active sessions immediately"
                            >
                              <LogOut className="h-3 w-3" />
                              Force Logout
                            </button>

                            {/* Lock / Unlock Toggle */}
                            <button
                              onClick={() =>
                                setDialogState({
                                  isOpen: true,
                                  type: "toggle_status",
                                  user: u,
                                })
                              }
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${
                                u.isActive
                                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                              }`}
                            >
                              {u.isActive ? (
                                <>
                                  <Lock className="h-3 w-3" /> Lock
                                </>
                              ) : (
                                <>
                                  <Unlock className="h-3 w-3" /> Unlock
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUTHENTICATION AUDIT TRAIL */}
      {activeTab === "attempts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={failedOnly}
                onChange={(e) => setFailedOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Show failed attempts only
            </label>

            <span className="text-xs text-slate-500">
              Showing {filteredAttempts.length} recent login events
            </span>
          </div>

          {loading ? (
            <SkeletonTable rows={6} cols={4} />
          ) : filteredAttempts.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No login events found"
              description="No authentication events matching your filter were found."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Attempted Email</th>
                      <th className="px-4 py-3">Client IP</th>
                      <th className="px-4 py-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAttempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400" suppressHydrationWarning>
                          <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(attempt.createdAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(attempt.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">
                          {attempt.email}
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            <Globe className="h-3 w-3 text-slate-400" />
                            {attempt.ip || "unknown-ip"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {attempt.success ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                              <AlertTriangle className="h-3 w-3 text-rose-500" />
                              Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        onCancel={() => setDialogState({ isOpen: false, type: "force_logout", user: null })}
        onConfirm={handleConfirmAction}
        title={
          dialogState.type === "force_logout"
            ? `Force Logout "${dialogState.user?.name}"`
            : dialogState.user?.isActive
            ? `Lock Account "${dialogState.user?.name}"`
            : `Unlock Account "${dialogState.user?.name}"`
        }
        description={
          dialogState.type === "force_logout"
            ? `This will increment the token version for ${dialogState.user?.email}, instantly revoking all active JWT sessions on all devices. The user must re-authenticate.`
            : dialogState.user?.isActive
            ? `Are you sure you want to lock this account? The user will be immediately logged out and forbidden from logging in until unlocked.`
            : `Are you sure you want to unlock this account? The user will be restored to active status and permitted to log in.`
        }
        confirmLabel={
          dialogState.type === "force_logout"
            ? "Revoke All Sessions"
            : dialogState.user?.isActive
            ? "Lock Account"
            : "Unlock Account"
        }
        loading={isPending}
      />
    </div>
  );
}
