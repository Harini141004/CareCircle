import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// POST /api/checklist -> Add checklist item to an appointment
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { appointmentId, task } = body;

    if (!appointmentId || !task?.trim()) {
      return NextResponse.json({ error: "appointmentId and task are required" }, { status: 400 });
    }

    // Verify appointment belongs to this caregiver
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { caregiverId: user.id } },
    });
    if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    const item = await prisma.checklistItem.create({
      data: { appointmentId, task: task.trim(), isCompleted: false },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("POST /api/checklist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
