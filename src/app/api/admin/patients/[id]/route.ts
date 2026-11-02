import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { handleApiError } from "@/lib/admin-helpers";
import { logAudit } from "@/lib/audit";

// GET /api/admin/patients/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRole("ADMIN");
    const { id } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        caregiver: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            verificationStatus: true,
            isActive: true,
          },
        },
        familyMembers: {
          select: {
            id: true,
            name: true,
            relationship: true,
            relationshipOther: true,
            isPrimaryContact: true,
            phone: true,
            email: true,
            isActive: true,
          },
          orderBy: [{ isPrimaryContact: "desc" }, { name: "asc" }],
        },
        _count: {
          select: {
            medications: true,
            appointments: true,
            alerts: true,
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // MANDATORY AUDIT: Every open writes an AuditLog entry ("Admin viewed patient X")
    await logAudit({
      actorType: "ADMIN",
      actorId: currentUser.id,
      action: "VIEW_PATIENT",
      targetType: "PATIENT",
      targetId: patient.id,
      summary: `Admin viewed patient ${patient.name}`,
    });

    return NextResponse.json({ patient });
  } catch (error) {
    return handleApiError(error);
  }
}
