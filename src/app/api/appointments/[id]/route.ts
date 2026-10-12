import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// PUT /api/appointments/[id] -> Update appointment status or details
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.appointment.findFirst({
      where: { id, patient: { caregiverId: user.id } },
    });
    if (!existing) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        doctorName: body.doctorName ?? existing.doctorName,
        specialty: body.specialty ?? existing.specialty,
        location: body.location ?? existing.location,
        dateTime: body.dateTime ? new Date(body.dateTime) : existing.dateTime,
        reason: body.reason ?? existing.reason,
        notes: body.notes ?? existing.notes,
        status: body.status ?? existing.status,
      },
      include: { checklistItems: true, patient: true },
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error("PUT /api/appointments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/appointments/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.appointment.findFirst({
      where: { id, patient: { caregiverId: user.id } },
    });
    if (!existing) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    await prisma.appointment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/appointments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
