"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  Mail,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  ExternalLink,
  Pill,
  HeartPulse,
  Calendar,
  AlertTriangle,
  Settings2,
  ShieldCheck,
  Save,
  RotateCcw,
  Sliders,
  Check,
  Info,
} from "lucide-react";

interface NotificationPreferences {
  MISSED_MED: boolean;
  REFILL_DUE: boolean;
  VITALS_WARNING: boolean;
  UPCOMING_APPOINTMENT: boolean;
}

interface NotificationSettingsData {
  configured: boolean;
  caregiverEmail: string;
  caregiverName?: string;
  notificationEmail: string;
  emailAlerts: boolean;
  inAppAlerts: boolean;
  preferences: NotificationPreferences;
}

const ALERT_TYPES = [
  {
    key: "MISSED_MED" as const,
    label: "Missed Medication",
    description: "Triggers when a scheduled medication dose is marked as missed or overdue.",
    icon: Pill,
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-50/70 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800/60",
    badgeBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
  },
  {
    key: "REFILL_DUE" as const,
    label: "Refill Urgently Needed",
    description: "Triggers when remaining pills fall at or below the prescribed refill threshold.",
    icon: AlertTriangle,
    color: "text-orange-500 dark:text-orange-400",
    bg: "bg-orange-50/70 dark:bg-orange-950/20",
    border: "border-orange-200 dark:border-orange-800/60",
    badgeBg: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300",
  },
  {
    key: "VITALS_WARNING" as const,
    label: "Abnormal Vitals Warning",
    description: "Triggers when logged blood pressure, blood glucose, or heart rate exceed safe bounds.",
    icon: HeartPulse,
    color: "text-rose-500 dark:text-rose-400",
    bg: "bg-rose-50/70 dark:bg-rose-950/20",
    border: "border-rose-200 dark:border-rose-800/60",
    badgeBg: "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300",
  },
  {
    key: "UPCOMING_APPOINTMENT" as const,
    label: "Appointment Reminders",
    description: "Triggers when a new doctor consultation or clinic visit is scheduled.",
    icon: Calendar,
    color: "text-indigo-500 dark:text-indigo-400",
    bg: "bg-indigo-50/70 dark:bg-indigo-950/20",
    border: "border-indigo-200 dark:border-indigo-800/60",
    badgeBg: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300",
  },
];

export default function NotificationSettingsPage() {
  const [data, setData] = useState<NotificationSettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    MISSED_MED: true,
    REFILL_DUE: true,
    VITALS_WARNING: true,
    UPCOMING_APPOINTMENT: true,
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testState, setTestState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Load preferences from database
  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((res: NotificationSettingsData) => {
        setData(res);
        setEmailAlerts(res.emailAlerts ?? true);
        setInAppAlerts(res.inAppAlerts ?? true);
        setNotificationEmail(res.notificationEmail ?? "");
        setPreferences({
          MISSED_MED: res.preferences?.MISSED_MED ?? true,
          REFILL_DUE: res.preferences?.REFILL_DUE ?? true,
          VITALS_WARNING: res.preferences?.VITALS_WARNING ?? true,
          UPCOMING_APPOINTMENT: res.preferences?.UPCOMING_APPOINTMENT ?? true,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load notification settings:", err);
        setLoading(false);
      });
  }, []);

  const handleTogglePreference = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaveSuccess(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailAlerts,
          inAppAlerts,
          notificationEmail: notificationEmail.trim() || null,
          preferences,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }

      const updated = await res.json();
      setEmailAlerts(updated.emailAlerts);
      setInAppAlerts(updated.inAppAlerts);
      setNotificationEmail(updated.notificationEmail || "");
      setPreferences(updated.preferences);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEmailAlerts(true);
    setInAppAlerts(true);
    setNotificationEmail("");
    setPreferences({
      MISSED_MED: true,
      REFILL_DUE: true,
      VITALS_WARNING: true,
      UPCOMING_APPOINTMENT: true,
    });
    setSaveSuccess(false);
  };

  const sendTestEmail = async () => {
    setTestState("sending");
    try {
      const res = await fetch("/api/settings/notifications", { method: "POST" });
      if (res.ok) {
        setTestState("sent");
      } else {
        setTestState("error");
      }
      setTimeout(() => setTestState("idle"), 4500);
    } catch {
      setTestState("error");
      setTimeout(() => setTestState("idle"), 4500);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm text-slate-500">Loading notification settings...</span>
      </div>
    );
  }

  const activeEmailTarget = notificationEmail.trim() || data?.caregiverEmail || "account email";

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
            <Settings2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notification Settings</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Customize alerts, email delivery preferences, and trigger thresholds
            </p>
          </div>
        </div>

        {/* Quick Save Indicator / Button in Header */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Reset to default values"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 text-emerald-300" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">Notification preferences saved successfully to your profile!</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm">
          <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Delivery Status Card */}
      <div
        className={`rounded-2xl border p-5 transition-all ${
          data?.configured
            ? "bg-violet-50/70 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800"
            : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              data?.configured
                ? "bg-violet-100 dark:bg-violet-900/60"
                : "bg-amber-100 dark:bg-amber-900/60"
            }`}
          >
            {data?.configured ? (
              <ShieldCheck className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2
                className={`font-semibold text-base ${
                  data?.configured
                    ? "text-violet-900 dark:text-violet-200"
                    : "text-amber-900 dark:text-amber-200"
                }`}
              >
                {data?.configured ? "Email Dispatch Service Connected" : "Email Service Not Configured"}
              </h2>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  data?.configured
                    ? "bg-violet-200 dark:bg-violet-900/80 text-violet-800 dark:text-violet-300"
                    : "bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300"
                }`}
              >
                {data?.configured ? "Active" : "Action Required"}
              </span>
            </div>

            {data?.configured ? (
              <p className="text-sm text-violet-700 dark:text-violet-300 mt-1">
                Clinical alerts will be sent to{" "}
                <span className="font-semibold underline decoration-violet-300 underline-offset-2">
                  {activeEmailTarget}
                </span>{" "}
                via Resend SMTP service.
              </p>
            ) : (
              <div className="mt-1 space-y-1.5">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Add your Resend API key to <code className="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code> to enable real-time email dispatch. In-app alerts remain active.
                </p>
                <a
                  href="https://resend.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Get free Resend API credentials
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: Delivery Channels */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Delivery Channels</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose which channels receive alert notifications
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Channel 1: In-App Alerts */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  In-App Dashboard Alerts
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Display real-time notification badges and detailed items in the top navigation bar's alert bell drawer.
                </div>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={inAppAlerts}
              onClick={() => {
                setInAppAlerts(!inAppAlerts);
                setSaveSuccess(false);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                inAppAlerts ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  inAppAlerts ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Channel 2: Email Notifications */}
          <div className="flex flex-col gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Email Notifications
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Send formatted clinical emails with severity flags and patient context directly to your inbox.
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={emailAlerts}
                onClick={() => {
                  setEmailAlerts(!emailAlerts);
                  setSaveSuccess(false);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                  emailAlerts ? "bg-violet-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    emailAlerts ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Custom Recipient Email Input */}
            {emailAlerts && (
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Alert Destination Email
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="email"
                      value={notificationEmail}
                      onChange={(e) => {
                        setNotificationEmail(e.target.value);
                        setSaveSuccess(false);
                      }}
                      placeholder={data?.caregiverEmail || "caregiver@example.com"}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                  >
                    Update Email
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  Leave blank to use your default account email (
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {data?.caregiverEmail}
                  </span>
                  ), or specify a secondary email address.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Clinical Alert Trigger Toggles */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Event Trigger Preferences</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Turn specific notification types on or off based on your caregiving workflow
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3.5">
          {ALERT_TYPES.map((type) => {
            const Icon = type.icon;
            const isEnabled = preferences[type.key];

            return (
              <div
                key={type.key}
                className={`flex items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                  isEnabled
                    ? `${type.bg} ${type.border}`
                    : "bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                    <Icon className={`w-5 h-5 ${type.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {type.label}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${type.badgeBg}`}>
                        {isEnabled ? "Active" : "Muted"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {type.description}
                    </p>
                  </div>
                </div>

                {/* Individual Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  onClick={() => handleTogglePreference(type.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    isEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                  title={`Toggle ${type.label}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom Save Action Bar */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Changes apply immediately across all managed patients.
          </span>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 text-emerald-300" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving Preferences..." : saveSuccess ? "Saved Successfully" : "Save Preferences"}
          </button>
        </div>
      </div>

      {/* SECTION 3: Test Email Verification */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Send a Test Email</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Verify your email credentials and check formatting by sending a sample alert to{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {activeEmailTarget}
              </span>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={sendTestEmail}
            disabled={testState === "sending" || !data?.configured}
            id="send-test-email-btn"
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
              !data?.configured
                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                : testState === "sent"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                : testState === "error"
                ? "bg-rose-500 text-white"
                : "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {testState === "sending" && <Loader2 className="w-4 h-4 animate-spin" />}
            {testState === "sent" && <CheckCircle2 className="w-4 h-4" />}
            {testState === "error" && <XCircle className="w-4 h-4" />}
            {testState === "idle" && <Send className="w-4 h-4" />}
            {testState === "sending"
              ? "Sending..."
              : testState === "sent"
              ? "Sent! Check your inbox"
              : testState === "error"
              ? "Failed — check Resend key"
              : "Send Test Email"}
          </button>
        </div>
      </div>

      {/* SECTION 4: Setup Guide (shown if not configured) */}
      {!data?.configured && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">⚡ Quick Resend Setup Guide</h2>
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">Create a free Resend account</p>
                <a
                  href="https://resend.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"
                >
                  resend.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">Generate an API key</p>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">Go to API Keys → Create API Key → Full Access</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  Add it to your <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-xs">.env.local</code>
                </p>
                <pre className="mt-2 p-3 bg-slate-900 text-violet-400 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed">
{`RESEND_API_KEY=re_your_key_here
NOTIFICATION_FROM_EMAIL=CareCircle <onboarding@resend.dev>`}
                </pre>
              </div>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
