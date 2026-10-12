import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// PATCH /api/checklist/[id] -> Toggle completion
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    // Verify item belongs to the user's appointment/patient
    const existing = await prisma.checklistItem.findFirst({
      where: {
        id,
        appointment: { patient: { caregiverId: user.id } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const updated = await prisma.checklistItem.update({
      where: { id },
      data: { isCompleted: body.isCompleted ?? !existing.isCompleted },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
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
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.checklistItem.findFirst({
      where: {
        id,
        appointment: { patient: { caregiverId: user.id } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    await prisma.checklistItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/checklist/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
