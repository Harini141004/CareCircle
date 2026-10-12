import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET /api/patients/[id] -> Detailed single patient view with medications, logs, appointments
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Enforce caregiver ownership
    const patient = await prisma.patient.findFirst({
      where: { id, caregiverId: user.id },
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
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (error) {
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
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify ownership first
    const existing = await prisma.patient.findFirst({
      where: { id, caregiverId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

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
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.patient.findFirst({
      where: { id, caregiverId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    await prisma.patient.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/patients/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
