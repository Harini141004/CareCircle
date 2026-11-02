import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { assertPatientAccess } from "@/lib/patient-scope";

// GET /api/patients/[id] -> Detailed single patient view with medications, logs, appointments
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Verify read access via patient scope
    await assertPatientAccess(user, id);

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        medications: {
          orderBy: { createdAt: "desc" },
          include: {
            logs: {
              take: 10,
              orderBy: { scheduledFor: "desc" },
            },
          },
        },
        symptomLogs: {
          orderBy: { timestamp: "desc" },
          take: 30,
        },
        appointments: {
          orderBy: { dateTime: "asc" },
          include: {
            checklistItems: true,
          },
        },
        alerts: {
          where: { isRead: false },
          orderBy: { createdAt: "desc" },
        },
        familyMembers: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            relationship: true,
            relationshipOther: true,
            isPrimaryContact: true,
            isActive: true,
          },
        },
        careNotes: {
          orderBy: { createdAt: "desc" },
          include: {
            caregiver: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/patients/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/patients/[id] -> Update patient record
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Assert write access (fails with 403 for FAMILY)
    const existing = await assertPatientAccess(user, id, { write: true });
    const body = await req.json();

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        dob: body.dob ? new Date(body.dob) : existing.dob,
        gender: body.gender ?? existing.gender,
        relationship: body.relationship ?? existing.relationship,
        primaryCondition: body.primaryCondition ?? existing.primaryCondition,
        bloodType: body.bloodType ?? existing.bloodType,
        allergies: body.allergies ?? existing.allergies,
        emergencyContact: body.emergencyContact ?? existing.emergencyContact,
        notes: body.notes ?? existing.notes,
        avatarColor: body.avatarColor ?? existing.avatarColor,
      },
    });

    return NextResponse.json({ patient: updated });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PUT /api/patients/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/patients/[id] -> Delete patient record
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Assert write access (fails with 403 for FAMILY)
    await assertPatientAccess(user, id, { write: true });

    await prisma.patient.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("DELETE /api/patients/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
