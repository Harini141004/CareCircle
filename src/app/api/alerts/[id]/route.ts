import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { assertClinicalAccess } from "@/lib/patient-scope";

// PATCH /api/alerts/[id] -> Acknowledge / resolve single alert with optional note
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();

    if (user.role === "FAMILY") {
      throw new AccessError("Forbidden: Family members have read-only access to clinical alerts", 403);
    }

    if (user.role === "CARETAKER") {
      assertClinicalAccess(user);
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { isRead = true, note } = body;

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Caregivers can only resolve their own alerts; Admins can resolve any
    if (user.role === "CARETAKER" && alert.caregiverId !== user.id) {
      return NextResponse.json({ error: "Unauthorized access to alert" }, { status: 403 });
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: { isRead: Boolean(isRead) },
    });

    // Write audit log if note provided
    if (note) {
      await prisma.auditLog.create({
        data: {
          actorType: user.role,
          actorId: user.id,
          action: "RESOLVED_ALERT",
          targetType: "Alert",
          targetId: id,
          summary: `${user.name} acknowledged alert "${alert.title}" with note: ${note}`,
        },
      });
    }

    return NextResponse.json({ alert: updated });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PATCH /api/alerts/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/alerts/[id] -> Dismiss / delete alert
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();

    if (user.role === "CARETAKER") {
      assertClinicalAccess(user);
    }

    const { id } = await params;

    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    if (user.role === "CARETAKER" && alert.caregiverId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.alert.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("DELETE /api/alerts/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
