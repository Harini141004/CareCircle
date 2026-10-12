import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET /api/alerts -> Return cross-patient alerts for logged-in caregiver
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts = await prisma.alert.findMany({
      where: { caregiverId: user.id },
      include: {
        patient: { select: { id: true, name: true, avatarColor: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const unreadCount = alerts.filter((a) => !a.isRead).length;

    return NextResponse.json({ alerts, unreadCount });
  } catch (error) {
    console.error("GET /api/alerts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/alerts/read-all -> Mark all alerts as read
export async function PATCH() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.alert.updateMany({
      where: { caregiverId: user.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/alerts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
