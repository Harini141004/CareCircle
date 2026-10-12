import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// POST /api/appointments/[id]/checklist -> Add a checklist item
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: appointmentId } = await params;
    const { task } = await req.json();

    if (!task) {
      return NextResponse.json({ error: "Task text is required" }, { status: 400 });
    }

    // Verify appointment belongs to caregiver
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { caregiverId: user.id } },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const item = await prisma.checklistItem.create({
      data: {
        appointmentId,
        task,
        isCompleted: false,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
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
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: appointmentId } = await params;
    const { itemId, isCompleted } = await req.json();

    if (!itemId) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    // Verify appointment belongs to caregiver
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { caregiverId: user.id } },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: { isCompleted: Boolean(isCompleted) },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("PATCH checklist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
