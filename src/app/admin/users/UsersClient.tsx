"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  Heart,
  KeyRound,
  Edit,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Activity,
  Phone,
  Mail,
  Calendar,
  Sparkles,
} from "lucide-react";
import { AddUserModal } from "@/components/admin/AddUserModal";
import { EditUserModal } from "@/components/admin/EditUserModal";
import { ResetPasswordModal } from "@/components/admin/ResetPasswordModal";
import { ReassignCaregiverModal } from "@/components/admin/ReassignCaregiverModal";
import { PatientDetailDrawer } from "@/components/admin/PatientDetailDrawer";
import { Toast } from "@/components/Toast";

type TabType = "admin" | "caregiver" | "patient" | "family";

interface UsersClientProps {
  currentAdminId: string;
}

export default function UsersClient({ currentAdminId }: UsersClientProps) {
  // Navigation & Filter state
  const [activeTab, setActiveTab] = useState<TabType>("admin");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(8);

  // Data state
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 8,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Dropdown helper data for Modals
  const [verifiedCaregivers, setVerifiedCaregivers] = useState<any[]>([]);
  const [availablePatients, setAvailablePatients] = useState<any[]>([]);

  // Modals & Drawers state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<any | null>(null);
  const [reassignPatient, setReassignPatient] = useState<any | null>(null);
  const [detailPatientId, setDetailPatientId] = useState<string | null>(null);
  const [confirmToggleUser, setConfirmToggleUser] = useState<{
    user: any;
    action: "deactivate" | "reactivate";
  } | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(
    null
  );

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  // Fetch users for active tab
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: activeTab,
        status: statusFilter,
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) {
        params.append("search", search.trim());
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load users");
      }
      const data = await res.json();
      setUsers(data.users || []);
      setPagination(
        data.pagination || {
          page: 1,
          limit,
          total: (data.users || []).length,
          totalPages: 1,
        }
      );
    } catch {
      showToast("Error loading user records", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, page, limit, search]);

  // Fetch caregiver & patient helper lists for dropdowns
  const fetchHelpers = useCallback(async () => {
    try {
      const [cgRes, patRes] = await Promise.all([
        fetch("/api/admin/users?type=caregiver&status=active&limit=100"),
        fetch("/api/admin/users?type=patient&status=active&limit=100"),
      ]);
      if (cgRes.ok) {
        const cgData = await cgRes.json();
        const verified = (cgData.users || []).filter(
          (c: any) => c.verificationStatus === "VERIFIED"
        );
        setVerifiedCaregivers(verified);
      }
      if (patRes.ok) {
        const patData = await patRes.json();
        setAvailablePatients(patData.users || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchHelpers();
  }, [fetchHelpers]);

  // Handle tab switch
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
  };

  // Toggle user activation (Soft delete / reactivate)
  const handleToggleActive = async (user: any, action: "deactivate" | "reactivate") => {
    if (activeTab === "admin" && user.id === currentAdminId && action === "deactivate") {
      showToast("You cannot deactivate your own administrator account", "error");
      setConfirmToggleUser(null);
      return;
    }

    try {
      const nextIsActive = action === "reactivate";
      const res = await fetch(`/api/admin/users/${activeTab}/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextIsActive }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || `Failed to ${action} user`, "error");
        return;
      }

      showToast(`User "${user.name}" has been ${action}d successfully`);
      setConfirmToggleUser(null);
      fetchUsers();
      fetchHelpers();
    } catch {
      showToast(`Error trying to ${action} user`, "error");
    }
  };

  const formatRelationship = (rel: string, relOther?: string | null) => {
    if (rel === "OTHER") return relOther || "Other";
    return rel.charAt(0) + rel.slice(1).toLowerCase();
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span>User Management</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Centrally manage Admins, Caregivers, Dependent Patients, and Family Members with scoped permissions.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-900/20 flex items-center gap-2 transition-all shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto">
        {(
          [
            { id: "admin", label: "Admins", icon: ShieldCheck },
            { id: "caregiver", label: "Caregivers", icon: UserCheck },
            { id: "patient", label: "Patients", icon: Activity },
            { id: "family", label: "Family Members", icon: Heart },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-800"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={`Search ${activeTab}s by name or email...`}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <button
            onClick={() => fetchUsers()}
            title="Refresh list"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Content: Table on Desktop, Cards on Mobile */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-xs font-semibold text-slate-400">Loading {activeTab}s...</span>
          </div>
        ) : users.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              No {activeTab}s found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search || statusFilter !== "all"
                ? "No records matched your search filter criteria. Try adjusting or clearing your filters."
                : `There are currently no ${activeTab} records. Click the button below to add your first one.`}
            </p>
            {search || statusFilter !== "all" ? (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 shadow-sm"
              >
                Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">User</th>
                    {activeTab !== "patient" && <th className="px-6 py-3.5">Contact</th>}
                    {activeTab === "caregiver" && (
                      <>
                        <th className="px-6 py-3.5">Verification</th>
                        <th className="px-6 py-3.5">Assigned Patients</th>
                      </>
                    )}
                    {activeTab === "patient" && (
                      <>
                        <th className="px-6 py-3.5">Assigned Caregiver</th>
                        <th className="px-6 py-3.5">Family Members</th>
                        <th className="px-6 py-3.5">Health Condition</th>
                      </>
                    )}
                    {activeTab === "family" && (
                      <>
                        <th className="px-6 py-3.5">Patient & Relationship</th>
                        <th className="px-6 py-3.5">Contact Role</th>
                      </>
                    )}
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* User Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm"
                            style={{
                              backgroundColor:
                                u.avatarColor ||
                                (activeTab === "admin"
                                  ? "#6366F1"
                                  : activeTab === "caregiver"
                                  ? "#0D9488"
                                  : activeTab === "family"
                                  ? "#8B5CF6"
                                  : "#EC4899"),
                            }}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <span>{u.name}</span>
                              {activeTab === "admin" && u.id === currentAdminId && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                  You
                                </span>
                              )}
                            </div>
                            {u.email && (
                              <div className="text-[11px] text-slate-400">{u.email}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Column (for non-patient) */}
                      {activeTab !== "patient" && (
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {u.phone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{u.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No phone</span>
                          )}
                        </td>
                      )}

                      {/* Caregiver specific columns */}
                      {activeTab === "caregiver" && (
                        <>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                u.verificationStatus === "VERIFIED"
                                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : u.verificationStatus === "PENDING"
                                  ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                  : "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              }`}
                            >
                              {u.verificationStatus || "VERIFIED"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {u._count?.patients || 0} dependent(s)
                            </span>
                          </td>
                        </>
                      )}

                      {/* Patient specific columns */}
                      {activeTab === "patient" && (
                        <>
                          <td className="px-6 py-4">
                            {u.caregiver ? (
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                                <div>
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {u.caregiver.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {u.caregiver.email}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-amber-500 font-medium">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setDetailPatientId(u.id)}
                              className="px-2.5 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 dark:hover:bg-violet-900 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
                            >
                              <Users className="w-3 h-3 text-violet-500" />
                              <span>{u._count?.familyMembers || 0} Family</span>
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {u.primaryCondition || "None recorded"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Blood: {u.bloodType || "N/A"}
                            </div>
                          </td>
                        </>
                      )}

                      {/* Family specific columns */}
                      {activeTab === "family" && (
                        <>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {u.patient?.name || "Unassigned"}
                              </div>
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                                {formatRelationship(u.relationship, u.relationshipOther)} of {u.patient?.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {u.isPrimaryContact ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 w-max">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                Primary Contact
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Secondary Contact</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Status Column */}
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.isActive
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Row Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Patient specific View Details Drawer Button */}
                          {activeTab === "patient" && (
                            <button
                              onClick={() => setDetailPatientId(u.id)}
                              title="View Patient Details & Family"
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Reassign Caregiver for Patient */}
                          {activeTab === "patient" && (
                            <button
                              onClick={() => setReassignPatient(u)}
                              title="Reassign Caregiver"
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit button */}
                          <button
                            onClick={() => setEditingUser(u)}
                            title="Edit User"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Reset Password (for non-patients) */}
                          {activeTab !== "patient" && (
                            <button
                              onClick={() => setResetPasswordUser(u)}
                              title="Reset Password"
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 transition-colors"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          )}

                          {/* Deactivate / Reactivate button */}
                          <button
                            onClick={() =>
                              setConfirmToggleUser({
                                user: u,
                                action: u.isActive ? "deactivate" : "reactivate",
                              })
                            }
                            title={u.isActive ? "Deactivate User" : "Reactivate User"}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.isActive
                                ? "hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600"
                                : "hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-400 hover:text-emerald-600"
                            }`}
                          >
                            {u.isActive ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Visible only on mobile screens) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <div key={u.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: u.avatarColor || "#6366F1" }}
                      >
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {u.name}
                        </div>
                        {u.email && <div className="text-xs text-slate-400">{u.email}</div>}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                      }`}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Attributes per type */}
                  {activeTab === "caregiver" && (
                    <div className="text-xs text-slate-500 space-y-1">
                      <div>Status: <strong className="text-slate-700 dark:text-slate-300">{u.verificationStatus}</strong></div>
                      <div>Patients: <strong className="text-slate-700 dark:text-slate-300">{u._count?.patients || 0}</strong></div>
                    </div>
                  )}

                  {activeTab === "patient" && (
                    <div className="text-xs text-slate-500 space-y-1">
                      <div>Caregiver: <strong className="text-slate-700 dark:text-slate-300">{u.caregiver?.name || "Unassigned"}</strong></div>
                      <div>Family: <strong className="text-slate-700 dark:text-slate-300">{u._count?.familyMembers || 0} members</strong></div>
                      <div>Condition: <strong className="text-slate-700 dark:text-slate-300">{u.primaryCondition || "None"}</strong></div>
                    </div>
                  )}

                  {activeTab === "family" && (
                    <div className="text-xs space-y-1">
                      <div className="text-slate-500">Patient: <strong className="text-slate-700 dark:text-slate-300">{u.patient?.name}</strong></div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                        {formatRelationship(u.relationship, u.relationshipOther)} of {u.patient?.name}
                      </span>
                    </div>
                  )}

                  {/* Mobile Actions Button Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    {activeTab === "patient" && (
                      <button
                        onClick={() => setDetailPatientId(u.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                    )}
                    {activeTab === "patient" && (
                      <button
                        onClick={() => setReassignPatient(u)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Reassign
                      </button>
                    )}
                    <button
                      onClick={() => setEditingUser(u)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Edit
                    </button>
                    {activeTab !== "patient" && (
                      <button
                        onClick={() => setResetPasswordUser(u)}
                        className="px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-700 dark:text-amber-400"
                      >
                        Password
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setConfirmToggleUser({
                          user: u,
                          action: u.isActive ? "deactivate" : "reactivate",
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                        u.isActive
                          ? "bg-rose-50 dark:bg-rose-950 text-rose-600"
                          : "bg-emerald-50 dark:bg-emerald-950 text-emerald-600"
                      }`}
                    >
                      {u.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Showing <strong className="text-slate-700 dark:text-slate-300">{users.length}</strong> of{" "}
                <strong className="text-slate-700 dark:text-slate-300">{pagination.total}</strong> {activeTab}s
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2">
                  Page {page} of {pagination.totalPages || 1}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add User Modal */}
      <AddUserModal
        type={activeTab}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg, "success");
          fetchUsers();
          fetchHelpers();
        }}
        verifiedCaregivers={verifiedCaregivers}
        availablePatients={availablePatients}
      />

      {/* Edit User Modal */}
      <EditUserModal
        type={activeTab}
        user={editingUser}
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onSuccess={(msg) => {
          showToast(msg, "success");
          fetchUsers();
          fetchHelpers();
        }}
        verifiedCaregivers={verifiedCaregivers}
        availablePatients={availablePatients}
      />

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <ResetPasswordModal
          type={activeTab as "admin" | "caregiver" | "family"}
          user={resetPasswordUser}
          isOpen={Boolean(resetPasswordUser)}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={(msg) => showToast(msg, "success")}
        />
      )}

      {/* Reassign Caregiver Modal */}
      {reassignPatient && (
        <ReassignCaregiverModal
          patient={reassignPatient}
          isOpen={Boolean(reassignPatient)}
          onClose={() => setReassignPatient(null)}
          onSuccess={(msg) => {
            showToast(msg, "success");
            fetchUsers();
            fetchHelpers();
          }}
          verifiedCaregivers={verifiedCaregivers}
        />
      )}

      {/* Patient Detail Drawer */}
      <PatientDetailDrawer
        patientId={detailPatientId}
        isOpen={Boolean(detailPatientId)}
        onClose={() => setDetailPatientId(null)}
      />

      {/* Deactivate / Reactivate Confirmation Dialog */}
      {confirmToggleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  confirmToggleUser.action === "deactivate"
                    ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                    : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {confirmToggleUser.action === "deactivate"
                    ? `Deactivate ${confirmToggleUser.user.name}?`
                    : `Reactivate ${confirmToggleUser.user.name}?`}
                </h3>
                <p className="text-xs text-slate-500">
                  {confirmToggleUser.action === "deactivate"
                    ? "Deactivation blocks portal login while preserving all historical clinical records and data integrity."
                    : "Reactivating restores normal login access for this account."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmToggleUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleToggleActive(confirmToggleUser.user, confirmToggleUser.action)
                }
                className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all ${
                  confirmToggleUser.action === "deactivate"
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-900/20"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20"
                }`}
              >
                Confirm {confirmToggleUser.action === "deactivate" ? "Deactivation" : "Reactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
