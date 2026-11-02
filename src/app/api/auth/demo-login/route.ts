import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, homePathForRole } from "@/lib/auth";

export async function POST() {
  try {
    // Only allow demo login if not in production AND explicitly enabled
    if (
      process.env.NODE_ENV === "production" ||
      process.env.ENABLE_DEMO_LOGIN !== "true"
    ) {
      return NextResponse.json(
        { error: "Demo login is disabled in this environment." },
        { status: 403 }
      );
    }

    const caregiver = await prisma.caregiver.findUnique({
      where: { email: "caregiver@carecircle.demo" },
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: "Demo account not seeded. Please run seed script." },
        { status: 404 }
      );
    }

    if ("isActive" in caregiver && (caregiver as any).isActive === false) {
      return NextResponse.json(
        { error: "Demo account is deactivated." },
        { status: 403 }
      );
    }

    // Demo login ALWAYS signs in as CARETAKER, never ADMIN
    await setSessionCookie(caregiver.id, "CARETAKER");

    return NextResponse.json({
      user: {
        id: caregiver.id,
        email: caregiver.email,
        name: caregiver.name,
        role: "CARETAKER" as const,
      },
      redirectUrl: homePathForRole("CARETAKER"),
    });
  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
