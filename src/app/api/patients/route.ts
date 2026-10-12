import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET /api/patients -> List all patients under logged-in caregiver
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Explicitly scope by caregiverId
    const patients = await prisma.patient.findMany({
      where: { caregiverId: user.id },
      include: {
        _count: {
          select: {
            medications: true,
            symptomLogs: true,
            appointments: true,
            alerts: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ patients });
  } catch (error) {
    console.error("GET /api/patients error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/patients -> Create a new patient child record under caregiver
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const {
      name,
      dob,
      gender,
      relationship,
      primaryCondition,
      bloodType,
      allergies,
      emergencyContact,
      notes,
      avatarColor,
    } = data;

    if (!name || !dob || !relationship) {
      return NextResponse.json(
        { error: "Name, DOB, and relationship are required" },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.create({
      data: {
        caregiverId: user.id, // Strictly scoped
        name,
        dob: new Date(dob),
        gender,
        relationship,
        primaryCondition,
        bloodType,
        allergies,
        emergencyContact,
        notes,
        avatarColor: avatarColor || "#0D9488",
      },
    });

    return NextResponse.json({ patient });
  } catch (error) {
    console.error("POST /api/patients error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
