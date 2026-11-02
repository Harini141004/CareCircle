import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { handleApiError } from "@/lib/admin-helpers";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const AlertActionSchema = z.object({
  alertId: z.string().min(1),
  action: z.enum(["ESCALATE", "DISMISS", "RESOLVE"]),
});

// GET /api/admin/alerts
export async function GET() {
  try {
    await requireRole("ADMIN");

    // Fetch escalation hours
    const escalationSetting = await prisma.systemSetting.findUnique({
      where: { key: "alertEscalationHours" },
    });
    const escalationHours = escalationSetting ? JSON.parse(escalationSetting.value) : 24;
    const escalationThreshold = new Date(Date.now() - escalationHours * 60 * 60 * 1000);

    const alerts = await prisma.alert.findMany({
      where: { isRead: false },
      orderBy: [{ createdAt: "asc" }],
      include: {
        caregiver: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Group alerts by caregiver
    const groupedByCaregiver: Record<string, { caregiver: any; alerts: any[] }> = {};

    alerts.forEach((alert) => {
      const cgId = alert.caregiverId;
      if (!groupedByCaregiver[cgId]) {
        groupedByCaregiver[cgId] = {
          caregiver: alert.caregiver,
          alerts: [],
        };
      }
      const isEscalated = new Date(alert.createdAt) <= escalationThreshold;
      groupedByCaregiver[cgId].alerts.push({
        ...alert,
        isEscalated,
      });
    });

    return NextResponse.json({
      escalationHours,
      totalUnresolved: alerts.length,
      groups: Object.values(groupedByCaregiver),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/admin/alerts
export async function PATCH(req: Request) {
  try {
    const currentUser = await requireRole("ADMIN");

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { alertId, action } = AlertActionSchema.parse(json);

    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        caregiver: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true } },
      },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    if (action === "RESOLVE" || action === "DISMISS") {
      await prisma.alert.update({
        where: { id: alertId },
        data: { isRead: true },
      });

      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action: "RESOLVE_ALERT",
        targetType: "ALERT",
        targetId: alertId,
        summary: `Admin resolved alert "${alert.title}" for patient ${alert.patient?.name || "N/A"}`,
      });

      return NextResponse.json({ success: true, message: "Alert marked resolved" });
    }

    if (action === "ESCALATE") {
      // Mark with danger severity and escalated prefix if not already
      const updated = await prisma.alert.update({
        where: { id: alertId },
        data: {
          severity: "danger",
          title: alert.title.startsWith("[ESCALATED]") ? alert.title : `[ESCALATED] ${alert.title}`,
        },
      });

      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action: "ESCALATE_ALERT",
        targetType: "ALERT",
        targetId: alertId,
        summary: `Admin escalated alert "${alert.title}" for caregiver ${alert.caregiver.name}`,
      });

      return NextResponse.json({
        success: true,
        message: "Alert marked as escalated",
        alert: updated,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
