import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// DELETE /api/alerts/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.alert.findFirst({
      where: { id, caregiverId: user.id },
    });
    if (!existing) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

    await prisma.alert.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/alerts/[id] -> Mark single alert as read
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.alert.findFirst({
      where: { id, caregiverId: user.id },
    });
    if (!existing) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

    const updated = await prisma.alert.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ alert: updated });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
