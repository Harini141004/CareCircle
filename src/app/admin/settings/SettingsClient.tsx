"use client";

import { useEffect, useState, useTransition } from "react";
import { PageHeader, SkeletonCard, EmptyState } from "@/components/shared";
import {
  Settings2,
  Clock,
  Pill,
  AlertTriangle,
  Mail,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Database,
  History,
} from "lucide-react";

interface SettingsData {
  overdueDoseMinutes: number;
  refillWarningDays: number;
  alertEscalationHours: number;
  alertRecipientEmails: string[];
}

export default function SettingsClient() {
  const [settings, setSettings] = useState<SettingsData>({
    overdueDoseMinutes: 60,
    refillWarningDays: 7,
    alertEscalationHours: 24,
    alertRecipientEmails: ["admin@carecircle.demo"],
  });
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load system settings");
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
      setUpdatedAt(data.updatedAt || null);
    } catch (err: any) {
      setError(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleAddEmail = () => {
    const email = newEmailInput.trim().toLowerCase();
    setEmailError(null);

    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (settings.alertRecipientEmails.includes(email)) {
      setEmailError("Email is already in the recipient list");
      return;
    }

    setSettings((prev) => ({
      ...prev,
      alertRecipientEmails: [...prev.alertRecipientEmails, email],
    }));
    setNewEmailInput("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    if (settings.alertRecipientEmails.length <= 1) {
      alert("At least one alert recipient email must be maintained.");
      return;
    }
    setSettings((prev) => ({
      ...prev,
      alertRecipientEmails: prev.alertRecipientEmails.filter((e) => e !== emailToRemove),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save settings");
        }

        const data = await res.json();
        setUpdatedAt(data.updatedAt || new Date().toISOString());
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } catch (err: any) {
        alert(err.message || "Failed to save settings");
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings & Automation Rules"
        description="Configure clinical alert thresholds, medication escalation timings, and emergency notification recipients."
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
          title="Error loading settings"
          description={error}
          action={{
            label: "Try Again",
            onClick: fetchSettings,
          }}
        />
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span>System settings saved successfully. Audit log record generated.</span>
            </div>
          )}

          {/* Section 1: Clinical Escalation Rules */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Clinical & Medication Timers
                </h2>
                <p className="text-xs text-slate-500">
                  Automated background policies governing dose overdue triggers and alert escalations.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Overdue Dose */}
              <div>
                <label
                  htmlFor="overdue-threshold"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Overdue Dose Window (Minutes)
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Time past scheduled dose before an alert is raised to caregiver.
                </p>
                <div className="relative mt-2">
                  <input
                    id="overdue-threshold"
                    type="number"
                    min={5}
                    max={1440}
                    value={settings.overdueDoseMinutes}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        overdueDoseMinutes: parseInt(e.target.value, 10) || 60,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                    min
                  </span>
                </div>
              </div>

              {/* Refill Warning */}
              <div>
                <label
                  htmlFor="refill-threshold"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Refill Low-Supply Warning (Days)
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Days of medication remaining before a refill alert is broadcast.
                </p>
                <div className="relative mt-2">
                  <input
                    id="refill-threshold"
                    type="number"
                    min={1}
                    max={60}
                    value={settings.refillWarningDays}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        refillWarningDays: parseInt(e.target.value, 10) || 7,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                    days
                  </span>
                </div>
              </div>

              {/* Alert Escalation */}
              <div>
                <label
                  htmlFor="escalation-threshold"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Supervisor Escalation SLA (Hours)
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Unread alert age before escalation flag appears on admin dashboard.
                </p>
                <div className="relative mt-2">
                  <input
                    id="escalation-threshold"
                    type="number"
                    min={1}
                    max={168}
                    value={settings.alertEscalationHours}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        alertEscalationHours: parseInt(e.target.value, 10) || 24,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                    hours
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Alert Dispatch Recipients */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  System Alert Recipients
                </h2>
                <p className="text-xs text-slate-500">
                  Administrative email addresses receiving escalated alerts, critical vitals anomalies, and security warnings.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {settings.alertRecipientEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
                  >
                    <Mail className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-1 rounded-full p-0.5 text-teal-600 hover:bg-teal-200 dark:text-teal-300 dark:hover:bg-teal-900"
                      title="Remove recipient"
                      aria-label={`Remove ${email}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex max-w-md items-center gap-2">
                <input
                  type="email"
                  placeholder="Add another email (e.g. alerts@carecircle.demo)"
                  value={newEmailInput}
                  onChange={(e) => {
                    setNewEmailInput(e.target.value);
                    setEmailError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddEmail}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              {emailError && <p className="text-xs text-rose-500">{emailError}</p>}
            </div>
          </div>

          {/* Section 3: Architecture & Security Overview */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Security & Architecture Blueprint
                </h2>
                <p className="text-xs text-slate-500">
                  Cryptographic parameters and operational runtime details.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/50">
                <div className="text-[11px] font-medium text-slate-500">Database Engine</div>
                <div className="mt-1 flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                  <Database className="h-4 w-4 text-teal-600" />
                  Prisma 7 + SQLite
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/50">
                <div className="text-[11px] font-medium text-slate-500">Session Security</div>
                <div className="mt-1 flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Jose HS256 JWT (7-Day TTL)
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/50">
                <div className="text-[11px] font-medium text-slate-500">Last Configuration Update</div>
                <div className="mt-1 flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                  <History className="h-4 w-4 text-blue-600" />
                  {updatedAt ? new Date(updatedAt).toLocaleString() : "System Default"}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Saving changes..." : "Save System Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
