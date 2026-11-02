import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { assertPatientAccess } from "@/lib/patient-scope";

// POST /api/checklist -> Add checklist item to an appointment
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { appointmentId, task } = body;

    if (!appointmentId || !task?.trim()) {
      return NextResponse.json({ error: "appointmentId and task are required" }, { status: 400 });
    }

    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    // Assert write access to the linked patient
    await assertPatientAccess(user, appt.patientId, { write: true });

    const item = await prisma.checklistItem.create({
      data: { appointmentId, task: task.trim(), isCompleted: false },
    });

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/checklist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
