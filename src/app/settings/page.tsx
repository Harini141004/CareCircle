"use client";

import React, { useEffect, useState } from "react";
import {
  Bell, Mail, CheckCircle2, XCircle, Send, Loader2, ExternalLink,
  Pill, HeartPulse, Calendar, AlertTriangle, Settings2, ShieldCheck,
} from "lucide-react";

interface NotificationSettings {
  configured: boolean;
  caregiverEmail: string;
  preferences: {
    MISSED_MED: boolean;
    REFILL_DUE: boolean;
    VITALS_WARNING: boolean;
    UPCOMING_APPOINTMENT: boolean;
  };
}

const ALERT_TYPES = [
  {
    key: "MISSED_MED",
    label: "Missed Medication",
    description: "When a patient's scheduled dose is marked as missed",
    icon: Pill,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    key: "REFILL_DUE",
    label: "Refill Due",
    description: "When a medication supply drops below the refill threshold",
    icon: AlertTriangle,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
  },
  {
    key: "VITALS_WARNING",
    label: "Abnormal Vitals",
    description: "When logged vitals exceed safe thresholds (BP, blood sugar, etc.)",
    icon: HeartPulse,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
  },
  {
    key: "UPCOMING_APPOINTMENT",
    label: "Appointment Reminder",
    description: "When a new doctor visit or appointment is scheduled",
    icon: Calendar,
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    border: "border-indigo-200 dark:border-indigo-800",
  },
] as const;

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [testState, setTestState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((data) => { setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sendTestEmail = async () => {
    setTestState("sending");
    try {
      const res = await fetch("/api/settings/notifications", { method: "POST" });
      setTestState(res.ok ? "sent" : "error");
      setTimeout(() => setTestState("idle"), 4000);
    } catch {
      setTestState("error");
      setTimeout(() => setTestState("idle"), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
          <Settings2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notification Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage how CareCircle alerts are delivered to your inbox
          </p>
        </div>
      </div>

      {/* Status Card */}
      <div className={`rounded-2xl border p-5 ${
        settings?.configured
          ? "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800"
          : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-xl ${settings?.configured ? "bg-violet-100 dark:bg-violet-900/50" : "bg-amber-100 dark:bg-amber-900/50"}`}>
            {settings?.configured
              ? <ShieldCheck className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              : <XCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            }
          </div>
          <div className="flex-1">
            <h2 className={`font-semibold text-base mb-1 ${settings?.configured ? "text-violet-800 dark:text-violet-300" : "text-amber-800 dark:text-amber-300"}`}>
              {settings?.configured ? "Email Notifications Active" : "Email Notifications Not Configured"}
            </h2>
            {settings?.configured ? (
              <p className="text-sm text-violet-700 dark:text-violet-400">
                Notifications are sent to{" "}
                <span className="font-semibold bg-violet-100 dark:bg-violet-900/60 px-2 py-0.5 rounded-md">
                  {settings.caregiverEmail}
                </span>
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Add your Resend API key to <code className="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code> to enable email alerts.
                </p>
                <a
                  href="https://resend.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Get a free Resend API key
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-indigo-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">How Email Notifications Work</h2>
        </div>
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">1</span>
            <p>A clinical event occurs — a missed medication, abnormal vital reading, low refill stock, or a new appointment scheduled.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">2</span>
            <p>CareCircle creates an in-app alert <strong>and</strong> simultaneously sends you a formatted HTML email notification via Resend.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">3</span>
            <p>You can also manually re-send any alert as an email from the <strong>Alerts bell icon</strong> in the top navigation bar.</p>
          </div>
        </div>
      </div>

      {/* Alert Types */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-indigo-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Alert Types Sent via Email</h2>
        </div>

        <div className="space-y-3">
          {ALERT_TYPES.map((type) => {
            const Icon = type.icon;
            const enabled = settings?.preferences[type.key] ?? true;
            return (
              <div
                key={type.key}
                className={`flex items-center gap-4 p-3.5 rounded-xl border ${type.bg} ${type.border} transition-all`}
              >
                <div className={`p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700/60`}>
                  <Icon className={`w-4 h-4 ${type.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{type.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{type.description}</div>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  enabled
                    ? "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}>
                  {enabled
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Enabled</>
                    : <><XCircle className="w-3.5 h-3.5" /> Disabled</>
                  }
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          To toggle individual alert types, update <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">NOTIFY_*=false</code> flags in your <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">.env.local</code> file and restart the server.
        </p>
      </div>

      {/* Test Email */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Send a Test Email</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Verify your Resend setup is working correctly by sending a test notification to your inbox.
            </p>
          </div>
          <button
            onClick={sendTestEmail}
            disabled={testState === "sending" || !settings?.configured}
            id="send-test-email-btn"
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
              !settings?.configured
                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                : testState === "sent"
                ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                : testState === "error"
                ? "bg-rose-500 text-white"
                : "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {testState === "sending" && <Loader2 className="w-4 h-4 animate-spin" />}
            {testState === "sent" && <CheckCircle2 className="w-4 h-4" />}
            {testState === "error" && <XCircle className="w-4 h-4" />}
            {testState === "idle" && <Send className="w-4 h-4" />}
            {testState === "sending" ? "Sending..." : testState === "sent" ? "Sent! Check your inbox" : testState === "error" ? "Failed — check API key" : "Send Test Email"}
          </button>
        </div>
      </div>

      {/* Setup Instructions */}
      {!settings?.configured && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">⚡ Quick Setup Guide</h2>
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">1</span>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">Create a free Resend account</p>
                <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5">
                  resend.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">2</span>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">Generate an API key</p>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">Go to API Keys → Create API Key → Full Access</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">3</span>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">Add it to your <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-xs">.env.local</code></p>
                <pre className="mt-2 p-3 cc-dialog text-violet-400 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed">
{`RESEND_API_KEY=re_your_key_here
NOTIFICATION_FROM_EMAIL=CareCircle <onboarding@resend.dev>`}
                </pre>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">4</span>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">Restart the dev server</p>
                <pre className="mt-2 p-3 cc-dialog text-violet-400 rounded-xl text-xs font-mono">npm run dev</pre>
              </div>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
