import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/notifications";

// GET /api/settings/notifications -> Return current env-based settings and caregiver email
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isConfigured =
      !!process.env.RESEND_API_KEY &&
      process.env.RESEND_API_KEY !== "re_PASTE_YOUR_KEY_HERE";

    return NextResponse.json({
      configured: isConfigured,
      caregiverEmail: user.email,
      preferences: {
        MISSED_MED:           process.env.NOTIFY_MISSED_MED !== "false",
        REFILL_DUE:           process.env.NOTIFY_REFILL_DUE !== "false",
        VITALS_WARNING:       process.env.NOTIFY_VITALS_WARNING !== "false",
        UPCOMING_APPOINTMENT: process.env.NOTIFY_UPCOMING_APPOINTMENT !== "false",
      },
    });
  } catch (error) {
    console.error("GET /api/settings/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/settings/notifications/test -> Send a test email
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await sendNotificationEmail({
      to: user.email,
      caregiverName: user.name,
      alertType: "UPCOMING_APPOINTMENT",
      severity: "info",
      title: "🧪 Test Notification — CareCircle",
      message: `Hi ${user.name}! Your CareCircle email notifications are working correctly. You will receive alerts like this one whenever a critical event occurs for your patients.`,
    });

    return NextResponse.json({ success: true, sentTo: user.email });
  } catch (error) {
    console.error("POST /api/settings/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
