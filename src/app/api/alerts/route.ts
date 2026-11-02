import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { assertClinicalAccess } from "@/lib/patient-scope";

// GET /api/alerts -> Return alerts for logged-in caregiver with optional filters
export async function GET(req: Request) {
  try {
    const user = await requireUser();

    if (user.role === "CARETAKER") {
      assertClinicalAccess(user);
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const severity = searchParams.get("severity");
    const type = searchParams.get("type");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const whereClause: any = {};

    if (user.role === "CARETAKER") {
      whereClause.caregiverId = user.id;
    } else if (user.role === "FAMILY") {
      whereClause.patient = {
        familyMembers: {
          some: { id: user.id },
        },
      };
    }

    if (patientId && patientId !== "all") {
      whereClause.patientId = patientId;
    }
    if (severity && severity !== "all") {
      whereClause.severity = severity;
    }
    if (type && type !== "all") {
      whereClause.type = type;
    }
    if (unreadOnly) {
      whereClause.isRead = false;
    }

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true, avatarColor: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const unreadWhere: any = { isRead: false };
    if (user.role === "CARETAKER") {
      unreadWhere.caregiverId = user.id;
    } else if (user.role === "FAMILY") {
      unreadWhere.patient = {
        familyMembers: {
          some: { id: user.id },
        },
      };
    }

    const unreadCount = await prisma.alert.count({
      where: unreadWhere,
    });

    return NextResponse.json({ alerts, unreadCount });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/alerts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/alerts -> Mark all alerts as read / resolved
export async function PATCH() {
  try {
    const user = await requireUser();

    if (user.role === "FAMILY") {
      throw new AccessError("Forbidden: Family members have read-only access to clinical alerts", 403);
    }

    if (user.role === "CARETAKER") {
      assertClinicalAccess(user);
    }

    await prisma.alert.updateMany({
      where: { caregiverId: user.id, isRead: false },
      data: { isRead: true },
    });

    await prisma.auditLog.create({
      data: {
        actorType: user.role,
        actorId: user.id,
        action: "RESOLVED_ALL_ALERTS",
        targetType: "Alert",
        summary: `Caregiver ${user.name} resolved all active alerts`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PATCH /api/alerts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
