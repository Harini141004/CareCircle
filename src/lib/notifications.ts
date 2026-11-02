import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export type AlertType = "MISSED_MED" | "REFILL_DUE" | "VITALS_WARNING" | "UPCOMING_APPOINTMENT";
export type AlertSeverity = "info" | "warning" | "danger";

export interface NotificationPayload {
  to: string;          // caregiver's email
  caregiverName: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  patientName?: string;
  patientColor?: string;
}

// ─── Color palette per severity ───────────────────────────────────────────────
const COLORS: Record<AlertSeverity, { bg: string; border: string; badge: string; icon: string }> = {
  danger:  { bg: "#fff5f5", border: "#fc8181", badge: "#e53e3e", icon: "🚨" },
  warning: { bg: "#fffbeb", border: "#f6ad55", badge: "#d97706", icon: "⚠️" },
  info:    { bg: "#f5f3ff", border: "#a78bfa", badge: "#6366f1", icon: "📅" },
};

// ─── Alert-type icons & subjects ─────────────────────────────────────────────
const ALERT_META: Record<AlertType, { emoji: string; subject: (p?: string) => string }> = {
  MISSED_MED:            { emoji: "💊", subject: (p) => `⚠️ Missed Medication — ${p ?? "Patient"}` },
  REFILL_DUE:            { emoji: "🔄", subject: (p) => `💊 Medication Refill Needed — ${p ?? "Patient"}` },
  VITALS_WARNING:        { emoji: "❤️", subject: (p) => `🚨 Abnormal Vitals Detected — ${p ?? "Patient"}` },
  UPCOMING_APPOINTMENT:  { emoji: "📅", subject: (p) => `📅 Appointment Reminder — ${p ?? "Patient"}` },
};

// ─── HTML Email Template ──────────────────────────────────────────────────────
function buildEmailHtml(payload: NotificationPayload): string {
  const { caregiverName, alertType, severity, title, message, patientName, patientColor } = payload;
  const c = COLORS[severity];
  const meta = ALERT_META[alertType];
  const now = new Date().toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4338ca,#7c3aed);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
            <div style="font-size:28px;margin-bottom:8px;">🩺</div>
            <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">CareCircle</div>
            <div style="color:#c4b5fd;font-size:12px;margin-top:4px;">Caregiver Coordination Dashboard</div>
          </td>
        </tr>

        <!-- Alert Banner -->
        <tr>
          <td style="background:${c.bg};border-left:4px solid ${c.border};border-right:4px solid ${c.border};padding:20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:48px;vertical-align:top;">
                  <div style="width:44px;height:44px;background:${c.badge};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;text-align:center;line-height:44px;">${meta.emoji}</div>
                </td>
                <td style="padding-left:16px;vertical-align:top;">
                  <div style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:6px;">${title}</div>
                  <div style="font-size:14px;color:#475569;line-height:1.6;">${message}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;padding:24px 32px;">
            <p style="margin:0 0 16px;font-size:14px;color:#334155;">Hello <strong>${caregiverName}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
              CareCircle has detected an alert that needs your attention. Please log in to the dashboard to take action.
            </p>

            ${patientName ? `
            <!-- Patient Badge -->
            <div style="background:#f1f5f9;border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;">
              <div style="width:36px;height:36px;border-radius:8px;background:${patientColor || "#0d9488"};color:#fff;font-weight:700;font-size:14px;text-align:center;line-height:36px;margin-right:12px;flex-shrink:0;">
                ${patientName.charAt(0)}
              </div>
              <div>
                <div style="font-size:13px;font-weight:600;color:#1e293b;">${patientName}</div>
                <div style="font-size:11px;color:#64748b;">Patient Profile</div>
              </div>
            </div>` : ""}

            <!-- CTA Button -->
            <div style="text-align:center;margin:24px 0;">
              <a href="http://localhost:3000/dashboard"
                 style="display:inline-block;background:linear-gradient(135deg,#4338ca,#7c3aed);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:10px;letter-spacing:0.3px;">
                Open CareCircle Dashboard →
              </a>
            </div>

            <!-- Severity Badge -->
            <div style="text-align:center;margin-top:4px;">
              <span style="display:inline-block;padding:4px 12px;border-radius:20px;background:${c.badge};color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
                ${severity === "danger" ? "🔴 Critical Alert" : severity === "warning" ? "🟡 Warning" : "🔵 Info"}
              </span>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              This alert was sent from <strong>CareCircle</strong> on ${now}.<br/>
              You are receiving this because you are a registered caregiver on this account.<br/>
              Manage notification preferences in <a href="http://localhost:3000/settings" style="color:#6366f1;">Settings</a>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Database-backed Caregiver Preferences ─────────────────────────────────
export interface CaregiverPreferences {
  emailAlerts: boolean;
  inAppAlerts: boolean;
  notifyMissedMed: boolean;
  notifyRefillDue: boolean;
  notifyVitalsWarning: boolean;
  notifyAppointment: boolean;
  notificationEmail: string | null;
}

export async function getCaregiverNotificationPreferences(caregiverId: string): Promise<CaregiverPreferences> {
  try {
    let pref = await prisma.notificationPreference.findFirst({
      where: { userId: caregiverId },
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          userType: "CARETAKER",
          userId: caregiverId,
          emailAlerts: true,
          inAppAlerts: true,
          notifyMissedMed: process.env.NOTIFY_MISSED_MED !== "false",
          notifyRefillDue: process.env.NOTIFY_REFILL_DUE !== "false",
          notifyVitalsWarning: process.env.NOTIFY_VITALS_WARNING !== "false",
          notifyAppointment: process.env.NOTIFY_UPCOMING_APPOINTMENT !== "false",
        },
      });
    }

    return {
      emailAlerts: pref.emailAlerts,
      inAppAlerts: pref.inAppAlerts,
      notifyMissedMed: pref.notifyMissedMed,
      notifyRefillDue: pref.notifyRefillDue,
      notifyVitalsWarning: pref.notifyVitalsWarning,
      notifyAppointment: pref.notifyAppointment,
      notificationEmail: pref.notificationEmail,
    };
  } catch (error) {
    console.error("Error retrieving notification preferences:", error);
    // Safe fallbacks
    return {
      emailAlerts: true,
      inAppAlerts: true,
      notifyMissedMed: true,
      notifyRefillDue: true,
      notifyVitalsWarning: true,
      notifyAppointment: true,
      notificationEmail: null,
    };
  }
}

// ─── Check per-alert-type toggle ──────────────────────────────────
export function isAlertTypeAllowedByPrefs(type: AlertType, prefs: CaregiverPreferences): boolean {
  if (!prefs.emailAlerts) return false;
  switch (type) {
    case "MISSED_MED":
      return prefs.notifyMissedMed;
    case "REFILL_DUE":
      return prefs.notifyRefillDue;
    case "VITALS_WARNING":
      return prefs.notifyVitalsWarning;
    case "UPCOMING_APPOINTMENT":
      return prefs.notifyAppointment;
    default:
      return true;
  }
}

function isAlertTypeEnabledFallback(type: AlertType): boolean {
  const map: Record<AlertType, string | undefined> = {
    MISSED_MED:           process.env.NOTIFY_MISSED_MED,
    REFILL_DUE:           process.env.NOTIFY_REFILL_DUE,
    VITALS_WARNING:       process.env.NOTIFY_VITALS_WARNING,
    UPCOMING_APPOINTMENT: process.env.NOTIFY_UPCOMING_APPOINTMENT,
  };
  const val = map[type];
  return val === undefined || val === "" || val === "true";
}

// ─── Is an email provider ready to send? ─────────────────────────────────────
// "console" always works (prints to the terminal). "smtp" needs Gmail credentials.
function isEmailConfigured(): boolean {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  if (provider === "console") return true;
  if (provider === "smtp") return !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
  return false;
}

// ─── Main export: send notification email ────────────────────────────────────
export async function sendNotificationEmail(
  payload: NotificationPayload & { caregiverId?: string }
): Promise<void> {
  // Silently skip if the email provider is not configured
  if (!isEmailConfigured()) {
    console.log("[CareCircle Notifications] Email provider not configured — skipping email for:", payload.title);
    return;
  }

  // Check caregiver preferences if caregiverId is provided
  let destinationEmail = payload.to;
  if (payload.caregiverId) {
    const prefs = await getCaregiverNotificationPreferences(payload.caregiverId);
    if (!isAlertTypeAllowedByPrefs(payload.alertType, prefs)) {
      console.log(`[CareCircle Notifications] Disabled by preferences for type: ${payload.alertType}`);
      return;
    }
    if (prefs.notificationEmail && prefs.notificationEmail.trim()) {
      destinationEmail = prefs.notificationEmail.trim();
    }
  } else {
    // Respect per-type fallback
    if (!isAlertTypeEnabledFallback(payload.alertType)) {
      console.log(`[CareCircle Notifications] Notifications disabled for type: ${payload.alertType}`);
      return;
    }
  }

  const subject = ALERT_META[payload.alertType].subject(payload.patientName);
  const html = buildEmailHtml({
    ...payload,
    to: destinationEmail,
  });

  // sendEmail never throws — email failure must not break core app functionality
  const result = await sendEmail({
    to: destinationEmail,
    subject,
    text: `${payload.title}. ${payload.message} Open CareCircle to view details.`,
    html,
  });

  if (result.ok) {
    console.log(`[CareCircle Notifications] Email sent to ${destinationEmail}`);
  } else {
    console.error("[CareCircle Notifications] Failed to send email:", result.error);
  }
}

// ─── Unified Alert Dispatcher ────────────────────────────────────────────────
export async function dispatchCaregiverAlert(params: {
  caregiverId: string;
  caregiverName: string;
  caregiverEmail: string;
  patientId?: string;
  type: AlertType;
  title: string;
  message: string;
  severity?: AlertSeverity;
  patientName?: string;
  patientColor?: string;
}) {
  const prefs = await getCaregiverNotificationPreferences(params.caregiverId);

  // 1. Create In-App Alert if enabled
  let alert = null;
  if (prefs.inAppAlerts) {
    try {
      alert = await prisma.alert.create({
        data: {
          caregiverId: params.caregiverId,
          patientId: params.patientId || null,
          type: params.type,
          title: params.title,
          message: params.message,
          severity: params.severity || "warning",
        },
      });
    } catch (err) {
      console.error("[CareCircle Notifications] Failed to create in-app alert:", err);
    }
  }

  // 2. Dispatch Email if enabled
  if (prefs.emailAlerts && isAlertTypeAllowedByPrefs(params.type, prefs)) {
    const recipient = prefs.notificationEmail?.trim() || params.caregiverEmail;
    await sendNotificationEmail({
      to: recipient,
      caregiverId: params.caregiverId,
      caregiverName: params.caregiverName,
      alertType: params.type,
      severity: params.severity || "warning",
      title: params.title,
      message: params.message,
      patientName: params.patientName,
      patientColor: params.patientColor,
    });
  }

  return alert;
}