import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie, homePathForRole } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Public signup strictly accepts only name, email, password
    // Never accept role or verification status from the request body
    const { name, email, password } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing user across all user collections
    const existingCaregiver = await prisma.caregiver.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingCaregiver) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const existingAdmin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const existingFamily = await prisma.familyMember.findUnique({ where: { email: normalizedEmail } });
    if (existingFamily) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Public signup always creates CARETAKER with verificationStatus PENDING
    const caregiver = await prisma.caregiver.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        verificationStatus: "PENDING",
        isActive: true,
      },
    });

    // Public signup always receives CARETAKER role
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
    console.error("Signup API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
