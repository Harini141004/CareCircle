import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { assertPatientAccess } from "@/lib/patient-scope";

// PATCH /api/checklist/[id] -> Toggle completion
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.checklistItem.findUnique({
      where: { id },
      include: { appointment: true },
    });
    if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    // Assert write access to the linked patient
    await assertPatientAccess(user, existing.appointment.patientId, { write: true });

    const updated = await prisma.checklistItem.update({
      where: { id },
      data: { isCompleted: body.isCompleted ?? !existing.isCompleted },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PATCH /api/checklist/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/checklist/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await prisma.checklistItem.findUnique({
      where: { id },
      include: { appointment: true },
    });
    if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    // Assert write access to the linked patient
    await assertPatientAccess(user, existing.appointment.patientId, { write: true });

    await prisma.checklistItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("DELETE /api/checklist/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
