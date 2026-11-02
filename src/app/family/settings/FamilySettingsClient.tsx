"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  User,
  Settings2,
  Bell,
  Lock,
  Phone,
  Mail,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface FamilyMemberData {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  relationship: string;
  relationshipOther?: string | null;
  isPrimaryContact: boolean;
  patientName: string;
}

interface PreferencesData {
  emailAlerts: boolean;
  notifyVitalsWarning: boolean;
  notifyRefillDue: boolean;
  notifyAppointment: boolean;
  notificationEmail: string;
}

interface FamilySettingsClientProps {
  familyMember: FamilyMemberData;
  initialPreferences: PreferencesData;
}

export default function FamilySettingsClient({
  familyMember,
  initialPreferences,
}: FamilySettingsClientProps) {
  const router = useRouter();

  // Profile state
  const [name, setName] = useState(familyMember.name);
  const [phone, setPhone] = useState(familyMember.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification preferences state
  const [emailAlerts, setEmailAlerts] = useState(initialPreferences.emailAlerts);
  const [notifyVitalsWarning, setNotifyVitalsWarning] = useState(initialPreferences.notifyVitalsWarning);
  const [notifyRefillDue, setNotifyRefillDue] = useState(initialPreferences.notifyRefillDue);
  const [notifyAppointment, setNotifyAppointment] = useState(initialPreferences.notifyAppointment);
  const [notificationEmail, setNotificationEmail] = useState(initialPreferences.notificationEmail);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/family/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setFeedback({ type: "success", message: "Personal details updated successfully." });
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to update profile" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setFeedback({ type: "error", message: "New password must be at least 8 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", message: "New password and confirmation do not match." });
      return;
    }

    setSavingPassword(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/family/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");

      setFeedback({
        type: "success",
        message: "Password changed successfully! Session revoked. Please log in with your new password.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Redirect to login after a brief pause
      setTimeout(() => {
        router.push("/login?message=password_changed");
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to change password" });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailAlerts,
          inAppAlerts: true,
          notificationEmail: notificationEmail.trim() || null,
          preferences: {
            VITALS_WARNING: notifyVitalsWarning,
            REFILL_DUE: notifyRefillDue,
            UPCOMING_APPOINTMENT: notifyAppointment,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save notification preferences");

      setFeedback({ type: "success", message: "Notification preferences saved successfully." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to save notification preferences" });
    } finally {
      setSavingPrefs(false);
    }
  };

  const relationshipTitle =
    familyMember.relationship === "OTHER"
      ? familyMember.relationshipOther || "Other"
      : familyMember.relationship.charAt(0) + familyMember.relationship.slice(1).toLowerCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Notification Preferences"
        description="Manage your contact information, configure real-time email alerts, and change your account password."
      />

      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Contact Details */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Personal Profile
              </h2>
              <p className="text-xs text-slate-400">Linked to {familyMember.patientName}</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <input
                type="email"
                value={familyMember.email}
                disabled
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2 text-xs text-slate-400 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400">Account identifier cannot be altered</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Relationship</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {relationshipTitle}
                </span>
              </div>
              {familyMember.isPrimaryContact && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Primary Emergency Contact
                </span>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50 transition-all"
              >
                {savingProfile ? "Saving..." : "Save Profile Details"}
              </button>
            </div>
          </form>
        </div>

        {/* Password & Security */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Security & Password
              </h2>
              <p className="text-xs text-slate-400">Revokes active sessions on change</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                New Password (minimum 8 characters)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300">
              Note: Updating your password will immediately increment your security token version, automatically terminating active sessions across other devices.
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-sm disabled:opacity-50 transition-all"
              >
                {savingPassword ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Email Notification Preferences
            </h2>
            <p className="text-xs text-slate-400">
              Customize real-time alerts concerning your loved one's health events
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Master Email Notifications
              </div>
              <p className="text-[11px] text-slate-500">
                Enable or disable all outbound email alerts from CareCircle
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyVitalsWarning}
                disabled={!emailAlerts}
                onChange={(e) => setNotifyVitalsWarning(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Abnormal Vitals
                </div>
                <p className="text-[11px] text-slate-500">
                  Critical blood pressure, blood sugar, or temperature warnings
                </p>
              </div>
            </label>

            <label className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyRefillDue}
                disabled={!emailAlerts}
                onChange={(e) => setNotifyRefillDue(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Refill Updates
                </div>
                <p className="text-[11px] text-slate-500">
                  Alerts when medications are low on stock or refills are fulfilled
                </p>
              </div>
            </label>

            <label className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyAppointment}
                disabled={!emailAlerts}
                onChange={(e) => setNotifyAppointment(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Appointment Reminders
                </div>
                <p className="text-[11px] text-slate-500">
                  Advance notices for scheduled medical consultations
                </p>
              </div>
            </label>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notification Email Override (Optional)
            </label>
            <input
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder={familyMember.email}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-slate-400">
              Leave blank to receive alerts at your login email ({familyMember.email})
            </span>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingPrefs}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 transition-all"
            >
              {savingPrefs ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
