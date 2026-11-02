"use client";

import React, { useState, useEffect } from "react";
import {
  Heart,
  UserCheck,
  Users,
  Search,
  RefreshCw,
  X,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRightLeft,
  ChevronRight,
  Shield,
  Star,
} from "lucide-react";
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  SkeletonTable,
  SkeletonList,
} from "@/components/shared";

interface FamilyMemberSummary {
  id: string;
  name: string;
  relationship: string;
  relationshipOther: string | null;
  isPrimaryContact: boolean;
  phone: string | null;
  email: string;
  isActive: boolean;
}

interface PatientItem {
  id: string;
  name: string;
  dob: string;
  gender: string | null;
  relationship: string;
  primaryCondition: string | null;
  bloodType: string | null;
  allergies: string | null;
  emergencyContact: string | null;
  notes: string | null;
  avatarColor: string;
  isActive: boolean;
  caregiver: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    verificationStatus: string;
    isActive: boolean;
  };
  familyMembers: FamilyMemberSummary[];
  _count: {
    medications: number;
    appointments: number;
  };
}

interface VerifiedCaregiver {
  id: string;
  name: string;
  email: string;
}

export default function PatientsClient({ adminName: _adminName }: { adminName: string }) {
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [verifiedCaregivers, setVerifiedCaregivers] = useState<VerifiedCaregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [caregiverFilter, setCaregiverFilter] = useState("ALL");

  // Drawer & Reassignment state
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [drawerPatient, setDrawerPatient] = useState<PatientItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [targetCaregiverId, setTargetCaregiverId] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/patients");
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
        setVerifiedCaregivers(data.verifiedCaregivers || []);
      }
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // When clicking a patient, open drawer and fetch audited endpoint
  const handleOpenDrawer = async (patientId: string) => {
    setSelectedPatientId(patientId);
    setDrawerLoading(true);
    try {
      // Calling GET /api/admin/patients/[id] triggers server-side AuditLog creation
      const res = await fetch(`/api/admin/patients/${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setDrawerPatient(data.patient);
      }
    } catch (err) {
      console.error("Failed to load patient drawer:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedPatientId(null);
    setDrawerPatient(null);
  };

  const handleReassignSubmit = async () => {
    if (!drawerPatient || !targetCaregiverId) return;

    try {
      setReassigning(true);
      const res = await fetch(`/api/admin/patients/${drawerPatient.id}/caregiver`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caregiverId: targetCaregiverId }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({
          type: "success",
          text: `Successfully reassigned ${drawerPatient.name} to new caregiver.`,
        });
        setReassignModalOpen(false);
        setTargetCaregiverId("");
        await fetchPatients();
        // Refresh drawer details
        handleOpenDrawer(drawerPatient.id);
      } else {
        setActionMessage({
          type: "error",
          text: data.error || "Failed to reassign caregiver",
        });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setReassigning(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.primaryCondition && p.primaryCondition.toLowerCase().includes(q)) ||
      p.caregiver.name.toLowerCase().includes(q);

    const matchesCaregiver =
      caregiverFilter === "ALL" || p.caregiver.id === caregiverFilter;

    return matchesSearch && matchesCaregiver;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients Oversight"
        description="Administrative management of patient profiles, primary caregiver assignments, and linked family contacts."
        badge="Platform"
        actions={
          <button
            onClick={fetchPatients}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-xs font-semibold shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Action Banner */}
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
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={caregiverFilter}
            onChange={(e) => setCaregiverFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="ALL">All Caregivers ({patients.length} patients)</option>
            {verifiedCaregivers.map((cg) => (
              <option key={cg.id} value={cg.id}>
                Caregiver: {cg.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients, conditions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>
      </div>

      {/* Table view */}
      {loading ? (
        <SkeletonTable rows={4} />
      ) : filteredPatients.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No Patients Found"
          description="No patients match your search criteria or assigned caregiver filter."
        />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Primary Condition</th>
                  <th className="py-3 px-4">Assigned Caregiver</th>
                  <th className="py-3 px-4">Family Members</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Administrative Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
                          style={{ backgroundColor: patient.avatarColor || "#0D9488" }}
                        >
                          {patient.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {patient.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Relation: {patient.relationship}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {patient.primaryCondition || "—"}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {patient.caregiver.name}
                        </span>
                        <StatusBadge status={patient.caregiver.verificationStatus} />
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">
                          {patient.familyMembers.length}{" "}
                          {patient.familyMembers.length === 1 ? "member" : "members"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={patient.isActive ? "ACTIVE" : "INACTIVE"} />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenDrawer(patient.id)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-semibold text-xs transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>View Drawer</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audited Administrative Patient Drawer */}
      {selectedPatientId && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold border border-indigo-200 dark:border-indigo-800">
                  <Shield className="w-3 h-3" />
                  <span>Audited Access</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Administrative Patient Record
                </h2>
                <p className="text-xs text-slate-400">
                  Accessing this clinical record has been logged in the platform audit trail.
                </p>
              </div>
              <button
                onClick={handleCloseDrawer}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {drawerLoading || !drawerPatient ? (
              <SkeletonList count={4} />
            ) : (
              <div className="space-y-6">
                {/* Patient Summary Header Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl text-white font-extrabold text-base flex items-center justify-center shadow-md"
                      style={{ backgroundColor: drawerPatient.avatarColor }}
                    >
                      {drawerPatient.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                        {drawerPatient.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {drawerPatient.gender || "Unspecified"} • DOB:{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(drawerPatient.dob))}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={drawerPatient.isActive ? "ACTIVE" : "INACTIVE"} />
                </div>

                {/* Assigned Caregiver Card & Reassign Button */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Assigned Primary Caregiver
                    </span>
                    <button
                      onClick={() => {
                        setTargetCaregiverId(drawerPatient.caregiver.id);
                        setReassignModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Reassign</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {drawerPatient.caregiver.name}
                        </span>
                        <StatusBadge status={drawerPatient.caregiver.verificationStatus} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {drawerPatient.caregiver.email}
                        </span>
                        {drawerPatient.caregiver.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {drawerPatient.caregiver.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linked Family Members */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Linked Family Members ({drawerPatient.familyMembers.length})
                    </span>
                  </div>

                  {drawerPatient.familyMembers.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">
                      No family member accounts are linked to this patient yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {drawerPatient.familyMembers.map((fm) => (
                        <div
                          key={fm.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {fm.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                                {fm.relationship === "OTHER" && fm.relationshipOther
                                  ? fm.relationshipOther
                                  : fm.relationship}
                              </span>
                              {fm.isPrimaryContact && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  Primary
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {fm.email} {fm.phone ? `• ${fm.phone}` : ""}
                            </p>
                          </div>
                          <StatusBadge status={fm.isActive ? "ACTIVE" : "INACTIVE"} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medical & Emergency Overview */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900 text-xs shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Medical & Emergency Profile
                  </span>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-400 text-[11px]">Primary Condition</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {drawerPatient.primaryCondition || "None recorded"}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-400 text-[11px]">Blood Type</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {drawerPatient.bloodType || "Unknown"}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-400 text-[11px]">Allergies</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {drawerPatient.allergies || "No known allergies"}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-400 text-[11px]">Emergency Contact</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {drawerPatient.emergencyContact || "None"}
                      </p>
                    </div>
                  </div>

                  {drawerPatient.notes && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 mt-2">
                      <span className="text-slate-400 text-[11px]">Caregiver Notes</span>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                        {drawerPatient.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reassign Caregiver Modal */}
      {reassignModalOpen && drawerPatient && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Reassign Caregiver
                  </h3>
                  <p className="text-xs text-slate-500">Patient: {drawerPatient.name}</p>
                </div>
              </div>
              <button
                onClick={() => setReassignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Only caregivers with verified credentials may be assigned. Active unread alerts for this patient will automatically transition to the new caregiver.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Verified Caregiver
              </label>
              <select
                value={targetCaregiverId}
                onChange={(e) => setTargetCaregiverId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose caregiver --</option>
                {verifiedCaregivers.map((cg) => (
                  <option key={cg.id} value={cg.id}>
                    {cg.name} ({cg.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReassignModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReassignSubmit}
                disabled={reassigning || !targetCaregiverId}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
              >
                {reassigning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
