import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { assertPatientAccess } from "@/lib/patient-scope";

// PUT /api/medications/[id] -> Update medication
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.medication.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

    // Verify user has write access to patient
    await assertPatientAccess(user, existing.patientId, { write: true });

    const updated = await prisma.medication.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        dosage: body.dosage ?? existing.dosage,
        frequency: body.frequency ?? existing.frequency,
        timesOfDay: body.timesOfDay ? JSON.stringify(body.timesOfDay) : existing.timesOfDay,
        instructions: body.instructions ?? existing.instructions,
        prescribingDoctor: body.prescribingDoctor ?? existing.prescribingDoctor,
        totalQuantity: body.totalQuantity ? parseInt(body.totalQuantity) : existing.totalQuantity,
        remainingQuantity: body.remainingQuantity ? parseInt(body.remainingQuantity) : existing.remainingQuantity,
        refillThreshold: body.refillThreshold ? parseInt(body.refillThreshold) : existing.refillThreshold,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      },
    });

    return NextResponse.json({ medication: updated });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PUT /api/medications/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/medications/[id] -> Delete medication
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await prisma.medication.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

    // Verify user has write access to patient
    await assertPatientAccess(user, existing.patientId, { write: true });

    await prisma.medication.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("DELETE /api/medications/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
