import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, AccessError } from "@/lib/access";
import { patientAccessFilter, assertClinicalAccess } from "@/lib/patient-scope";

// GET /api/patients -> List all patients accessible to the logged-in user
export async function GET() {
  try {
    const user = await requireUser();
    assertClinicalAccess(user);

    // Scoped via patientAccessFilter (CARETAKER sees own patients, ADMIN sees all, FAMILY sees linked)
    const rawPatients = await prisma.patient.findMany({
      where: patientAccessFilter(user),
      include: {
        _count: {
          select: {
            medications: true,
            symptomLogs: true,
            appointments: true,
            alerts: true,
          },
        },
        alerts: {
          where: { isRead: false },
          select: { id: true, severity: true },
        },
        medications: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            logs: {
              where: {
                status: "MISSED",
                scheduledFor: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              },
              select: { id: true },
            },
          },
        },
        familyMembers: {
          select: { id: true, name: true, relationship: true, isPrimaryContact: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const patients = rawPatients.map((p) => {
      const openAlertsCount = p.alerts.length;
      const missedDosesCount = p.medications.reduce((acc, m) => acc + m.logs.length, 0);

      let statusChip: "DOSE_OVERDUE" | "ALERT_OPEN" | "ALL_GOOD" = "ALL_GOOD";
      if (missedDosesCount > 0) {
        statusChip = "DOSE_OVERDUE";
      } else if (openAlertsCount > 0) {
        statusChip = "ALERT_OPEN";
      }

      return {
        ...p,
        statusChip,
        openAlertsCount,
        missedDosesCount,
      };
    });

    return NextResponse.json({ patients });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/patients error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/patients -> Create a new patient child record (Caregiver or Admin)
export async function POST(req: Request) {
  try {
    const user = await requireRole("CARETAKER", "ADMIN");
    assertClinicalAccess(user);

    const data = await req.json();
    const {
      name,
      dob,
      gender,
      relationship,
      primaryCondition,
      bloodType,
      allergies,
      emergencyContact,
      notes,
      avatarColor,
      caregiverId,
    } = data;

    if (!name || !dob || !relationship) {
      return NextResponse.json(
        { error: "Name, DOB, and relationship are required" },
        { status: 400 }
      );
    }

    // If admin is creating, allow assigning to specific caregiverId; otherwise use user's ID
    const assignedCaregiverId = user.role === "ADMIN" && caregiverId ? caregiverId : user.id;

    const patient = await prisma.patient.create({
      data: {
        caregiverId: assignedCaregiverId,
        name,
        dob: new Date(dob),
        gender,
        relationship,
        primaryCondition,
        bloodType,
        allergies,
        emergencyContact,
        notes,
        avatarColor: avatarColor || "#0D9488",
      },
    });

    return NextResponse.json({ patient });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/patients error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
