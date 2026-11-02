import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, AccessError } from "@/lib/access";
import {
  sendNotificationEmail,
  getCaregiverNotificationPreferences,
} from "@/lib/notifications";

// GET /api/settings/notifications -> Return stored preferences
export async function GET() {
  try {
    const user = await requireRole("CARETAKER", "ADMIN", "FAMILY");

        const isConfigured =
      process.env.EMAIL_PROVIDER === "smtp" &&
      !!process.env.SMTP_USER &&
      !!process.env.SMTP_PASS;

    const prefs = await getCaregiverNotificationPreferences(user.id);

    return NextResponse.json({
      configured: isConfigured,
      caregiverEmail: user.email,
      caregiverName: user.name,
      notificationEmail: prefs.notificationEmail || "",
      emailAlerts: prefs.emailAlerts,
      inAppAlerts: prefs.inAppAlerts,
      preferences: {
        MISSED_MED: prefs.notifyMissedMed,
        REFILL_DUE: prefs.notifyRefillDue,
        VITALS_WARNING: prefs.notifyVitalsWarning,
        UPCOMING_APPOINTMENT: prefs.notifyAppointment,
      },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/settings/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/settings/notifications -> Update and persist preferences
export async function PUT(req: Request) {
  try {
    const user = await requireRole("CARETAKER", "ADMIN", "FAMILY");

    const body = await req.json();
    const {
      emailAlerts = true,
      inAppAlerts = true,
      preferences = {},
      notificationEmail = null,
    } = body;

    const userRole = user.role || "CARETAKER";
    const updated = await prisma.notificationPreference.upsert({
      where: {
        userType_userId: {
          userType: userRole,
          userId: user.id,
        },
      },
      update: {
        emailAlerts: Boolean(emailAlerts),
        inAppAlerts: Boolean(inAppAlerts),
        notifyMissedMed: preferences.MISSED_MED !== false,
        notifyRefillDue: preferences.REFILL_DUE !== false,
        notifyVitalsWarning: preferences.VITALS_WARNING !== false,
        notifyAppointment: preferences.UPCOMING_APPOINTMENT !== false,
        notificationEmail: notificationEmail ? String(notificationEmail).trim() : null,
      },
      create: {
        userType: userRole,
        userId: user.id,
        emailAlerts: Boolean(emailAlerts),
        inAppAlerts: Boolean(inAppAlerts),
        notifyMissedMed: preferences.MISSED_MED !== false,
        notifyRefillDue: preferences.REFILL_DUE !== false,
        notifyVitalsWarning: preferences.VITALS_WARNING !== false,
        notifyAppointment: preferences.UPCOMING_APPOINTMENT !== false,
        notificationEmail: notificationEmail ? String(notificationEmail).trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      emailAlerts: updated.emailAlerts,
      inAppAlerts: updated.inAppAlerts,
      notificationEmail: updated.notificationEmail || "",
      preferences: {
        MISSED_MED: updated.notifyMissedMed,
        REFILL_DUE: updated.notifyRefillDue,
        VITALS_WARNING: updated.notifyVitalsWarning,
        UPCOMING_APPOINTMENT: updated.notifyAppointment,
      },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PUT /api/settings/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/settings/notifications -> Send a test email
export async function POST() {
  try {
    const user = await requireRole("CARETAKER", "ADMIN");

    const prefs = await getCaregiverNotificationPreferences(user.id);
    const destination = prefs.notificationEmail?.trim() || user.email;

    await sendNotificationEmail({
      to: destination,
      caregiverName: user.name,
      alertType: "UPCOMING_APPOINTMENT",
      severity: "info",
      title: "🧪 Test Notification — CareCircle",
      message: `Hi ${user.name}! Your CareCircle email notifications are active and working smoothly. You will receive real-time alerts whenever a critical event occurs for your patients.`,
    });

    return NextResponse.json({ success: true, sentTo: destination });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/settings/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
