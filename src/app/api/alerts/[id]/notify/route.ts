import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { sendNotificationEmail, AlertType, AlertSeverity } from "@/lib/notifications";

// POST /api/alerts/[id]/notify -> Manually re-send the email for a specific alert
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Fetch the alert, confirm it belongs to this caregiver
    const alert = await prisma.alert.findFirst({
      where: { id, caregiverId: user.id },
      include: {
        patient: { select: { name: true, avatarColor: true } },
      },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    await sendNotificationEmail({
      to: user.email,
      caregiverName: user.name,
      alertType: alert.type as AlertType,
      severity: alert.severity as AlertSeverity,
      title: alert.title,
      message: alert.message,
      patientName: alert.patient?.name,
      patientColor: alert.patient?.avatarColor,
    });

    return NextResponse.json({ success: true, sentTo: user.email });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/alerts/[id]/notify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
