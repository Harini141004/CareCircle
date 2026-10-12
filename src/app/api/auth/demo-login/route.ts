import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    let caregiver = await prisma.caregiver.findUnique({
      where: { email: "caregiver@carecircle.demo" },
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: "Demo account not seeded. Please run seed script." },
        { status: 404 }
      );
    }

    await setSessionCookie(caregiver.id);

    return NextResponse.json({
      user: { id: caregiver.id, email: caregiver.email, name: caregiver.name },
    });
  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
