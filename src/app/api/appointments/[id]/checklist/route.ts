import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { assertPatientAccess } from "@/lib/patient-scope";

// POST /api/appointments/[id]/checklist -> Add a checklist item
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: appointmentId } = await params;
    const { task } = await req.json();

    if (!task) {
      return NextResponse.json({ error: "Task text is required" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Assert write access to the linked patient
    await assertPatientAccess(user, appointment.patientId, { write: true });

    const item = await prisma.checklistItem.create({
      data: {
        appointmentId,
        task,
        isCompleted: false,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST checklist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/appointments/[id]/checklist -> Toggle item completion
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: appointmentId } = await params;
    const { itemId, isCompleted } = await req.json();

    if (!itemId) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Assert write access to the linked patient
    await assertPatientAccess(user, appointment.patientId, { write: true });

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: { isCompleted: Boolean(isCompleted) },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PATCH checklist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
