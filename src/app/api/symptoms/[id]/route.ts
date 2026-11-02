import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { assertPatientAccess } from "@/lib/patient-scope";

// DELETE /api/symptoms/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await prisma.symptomLog.findUnique({
      where: { id },
    });
    if (!existing) return NextResponse.json({ error: "Log not found" }, { status: 404 });

    // Verify user has write access to patient
    await assertPatientAccess(user, existing.patientId, { write: true });

    await prisma.symptomLog.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("DELETE /api/symptoms/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
