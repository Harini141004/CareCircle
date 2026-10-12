import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/notifications";

// GET /api/appointments?patientId=...
export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    const whereClause: any = {
      patient: { caregiverId: user.id },
    };

    if (patientId && patientId !== "all") {
      whereClause.patientId = patientId;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true, avatarColor: true, primaryCondition: true } },
        checklistItems: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { dateTime: "asc" },
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("GET /api/appointments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/appointments -> Create new appointment with initial checklist items
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      patientId,
      doctorName,
      specialty,
      location,
      dateTime,
      reason,
      notes,
      checklistTasks, // array of strings
    } = body;

    if (!patientId || !doctorName || !dateTime) {
      return NextResponse.json(
        { error: "Patient, doctor name, and date/time are required" },
        { status: 400 }
      );
    }

    // Verify patient belongs to caregiver
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, caregiverId: user.id },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const appointmentDate = new Date(dateTime);

    // Default pre-visit checklist items if none provided
    const defaultTasks = [
      "Bring current pill bottles & prescription list",
      "Print recent 14-day vitals & symptom trend summary",
      "Note down top 3 questions for doctor",
    ];

    const tasksToCreate = (checklistTasks && checklistTasks.length > 0)
      ? checklistTasks
      : defaultTasks;

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorName,
        specialty: specialty || null,
        location: location || null,
        dateTime: appointmentDate,
        reason: reason || null,
        notes: notes || null,
        status: "UPCOMING",
        checklistItems: {
          create: tasksToCreate.map((task: string) => ({
            task,
            isCompleted: false,
          })),
        },
      },
      include: {
        checklistItems: true,
      },
    });

    // Create upcoming appointment alert
    await prisma.alert.create({
      data: {
        caregiverId: user.id,
        patientId: patient.id,
        type: "UPCOMING_APPOINTMENT",
        title: "New Appointment Scheduled",
        message: `Appointment with ${doctorName} scheduled for ${patient.name} on ${appointmentDate.toLocaleDateString()} at ${appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        severity: "info",
      },
    });

    // Send email notification
    await sendNotificationEmail({
      to: user.email,
      caregiverName: user.name,
      alertType: "UPCOMING_APPOINTMENT",
      severity: "info",
      title: "New Appointment Scheduled",
      message: `Appointment with ${doctorName}${specialty ? ` (${specialty})` : ""} has been scheduled for ${patient.name} on ${appointmentDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at ${appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${location ? ` at ${location}` : ""}.`,
      patientName: patient.name,
      patientColor: patient.avatarColor,
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("POST /api/appointments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
