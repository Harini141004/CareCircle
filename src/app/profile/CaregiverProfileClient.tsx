"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Award,
  BookOpen,
  Briefcase,
  FileText,
  Phone,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Users,
  Key,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, SkeletonDetail } from "@/components/shared";

interface PatientSummary {
  id: string;
  name: string;
  dob: string;
  relationship: string;
  avatarColor: string;
  primaryCondition?: string | null;
}

interface CaregiverData {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason?: string | null;
  education?: string | null;
  previousExperience?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  patients: PatientSummary[];
}

interface AdherenceData {
  score: number;
  totalLogs: number;
  takenLogs: number;
  tier: string;
}

export default function CaregiverProfileClient({ caregiverId }: { caregiverId: string }) {
  const router = useRouter();
  const [caregiver, setCaregiver] = useState<CaregiverData | null>(null);
  const [adherence, setAdherence] = useState<AdherenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Profile form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [education, setEducation] = useState("");
  const [previousExperience, setPreviousExperience] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  // Change Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await fetch("/api/profile");
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load profile");
        }
        const data = await res.json();
        setCaregiver(data.caregiver);
        setAdherence(data.adherence);

        // Pre-fill editable fields
        setName(data.caregiver.name || "");
        setPhone(data.caregiver.phone || "");
        setEducation(data.caregiver.education || "");
        setPreviousExperience(data.caregiver.previousExperience || "");
      } catch (err: any) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileSuccessMsg("");
    setError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || null,
          education: education || null,
          previousExperience: previousExperience || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setProfileSuccessMsg("Profile details updated successfully!");
      setTimeout(() => setProfileSuccessMsg(""), 4000);
      setCaregiver((prev) => (prev ? { ...prev, ...data.caregiver } : null));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      alert("Password changed successfully! You will now be redirected to log in with your new password.");
      router.push("/login");
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <SkeletonDetail />;
  }

  if (error && !caregiver) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  if (!caregiver) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caregiver Profile & Verification"
        description="Review your professional credentials, active verification status, and adherence tier."
      />

      {/* Verification Status Banner */}
      {caregiver.verificationStatus === "PENDING" ? (
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3.5">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
              Account Awaiting Admin Verification
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Your credentials and documents are currently under administrative review. Clinical features remain locked until approval.
            </p>
          </div>
        </div>
      ) : caregiver.verificationStatus === "REJECTED" ? (
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-start gap-3.5">
          <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-rose-900 dark:text-rose-200">
              Account Verification Rejected
            </h4>
            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              Reason provided by Admin:{" "}
              <span className="font-bold">{caregiver.rejectionReason || "Credentials did not meet onboarding requirements."}</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                Verified Caregiver
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                Active & Authorized
              </span>
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              Full clinical charting, medication logging, and appointment coordination capabilities enabled.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Adherence Tier"
          value={adherence ? `${adherence.score}%` : "100%"}
          subtext={adherence?.tier || "Gold Caregiver"}
          variant="teal"
          icon={Award}
        />
        <StatCard
          label="Assigned Patients"
          value={caregiver.patients.length}
          subtext="Active dependent profiles"
          variant="indigo"
          icon={Users}
        />
        <StatCard
          label="Doses Logged"
          value={adherence?.totalLogs ?? 0}
          subtext={`${adherence?.takenLogs ?? 0} taken on time`}
          variant="violet"
          icon={CheckCircle2}
        />
        <StatCard
          label="Experience"
          value={caregiver.previousExperience || "N/A"}
          subtext="Professional practice"
          variant="amber"
          icon={Briefcase}
        />
      </div>

      {/* Main Grid: Details & Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Overview & Assigned Patients */}
        <div className="space-y-6 lg:col-span-1">
          {/* Caregiver Identity Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                {caregiver.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {caregiver.name}
                </h3>
                <span className="text-xs text-slate-500 block">{caregiver.email}</span>
                {caregiver.phone && (
                  <span className="text-xs text-slate-500 block">{caregiver.phone}</span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Experience</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-right truncate max-w-[160px]">
                  {caregiver.previousExperience || "Not listed"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Education</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-right truncate max-w-[160px]">
                  {caregiver.education || "Not listed"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Last Login</span>
                <span className="text-slate-600 dark:text-slate-400" suppressHydrationWarning>
                  {caregiver.lastLoginAt
                    ? new Date(caregiver.lastLoginAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })
                    : "Recent"}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Patients Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <span>Assigned Patients ({caregiver.patients.length})</span>
              </h4>
              <Link
                href="/patients"
                className="text-xs font-semibold text-teal-600 hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="space-y-2">
              {caregiver.patients.map((p) => (
                <Link
                  key={p.id}
                  href={`/patients/${p.id}`}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg text-white font-bold flex items-center justify-center text-xs"
                      style={{ backgroundColor: p.avatarColor || "#0D9488" }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-400">{p.relationship}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Edit Profile & Change Password */}
        <div className="space-y-6 lg:col-span-2">
          {/* Edit Profile Form */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" />
              <span>Edit Professional Credentials & Contact</span>
            </h3>

            {profileSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                {profileSuccessMsg}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 019-2831"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Previous Clinical Experience / Certifications
                  </label>
                  <input
                    type="text"
                    value={previousExperience}
                    onChange={(e) => setPreviousExperience(e.target.value)}
                    placeholder="e.g. 5 years geriatric care, CNA certified"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Education & Degrees
                  </label>
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="e.g. B.S. in Nursing, Univ of Michigan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {updatingProfile ? "Saving..." : "Save Profile Details"}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-teal-600" />
              <span>Change Account Password</span>
            </h3>
            <p className="text-xs text-slate-500">
              Updating your password will revoke all other active sessions and prompt you to log in again.
            </p>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {changingPassword ? "Updating..." : "Update Password & Re-login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
