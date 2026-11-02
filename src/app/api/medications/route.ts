import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { patientAccessFilter, assertPatientAccess } from "@/lib/patient-scope";
import { dispatchCaregiverAlert } from "@/lib/notifications";

// GET /api/medications?patientId=... -> List medications scoped to accessible patients
export async function GET(req: Request) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    const whereClause: any = {
      patient: patientAccessFilter(user), // Ownership / role scoping
    };

    if (patientId && patientId !== "all") {
      whereClause.patientId = patientId;
    }

    const medications = await prisma.medication.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true, avatarColor: true } },
        logs: {
          orderBy: { scheduledFor: "desc" },
          take: 14,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ medications });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/medications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/medications -> Add a new medication for a patient
export async function POST(req: Request) {
  try {
    const user = await requireUser();

    const body = await req.json();
    const {
      patientId,
      name,
      dosage,
      frequency,
      timesOfDay,
      instructions,
      prescribingDoctor,
      totalQuantity,
      remainingQuantity,
      refillThreshold,
    } = body;

    if (!patientId || !name || !dosage || !frequency) {
      return NextResponse.json(
        { error: "Patient, medication name, dosage, and frequency are required" },
        { status: 400 }
      );
    }

    // Verify patient access with write permission
    const patient = await assertPatientAccess(user, patientId, { write: true });

    const parsedTimes = Array.isArray(timesOfDay)
      ? JSON.stringify(timesOfDay)
      : JSON.stringify([timesOfDay || "08:00"]);

    const initialQty = totalQuantity ? parseInt(totalQuantity) : 30;
    const remQty = remainingQuantity ? parseInt(remainingQuantity) : initialQty;
    const threshold = refillThreshold ? parseInt(refillThreshold) : 7;

    const medication = await prisma.medication.create({
      data: {
        patientId,
        name,
        dosage,
        frequency,
        timesOfDay: parsedTimes,
        instructions,
        prescribingDoctor,
        totalQuantity: initialQty,
        remainingQuantity: remQty,
        refillThreshold: threshold,
      },
    });

    // Check if initial quantity is already below threshold and trigger alert
    const assignedCaregiver = await prisma.caregiver.findUnique({
      where: { id: patient.caregiverId },
    });

    if (remQty <= threshold && assignedCaregiver) {
      await dispatchCaregiverAlert({
        caregiverId: patient.caregiverId,
        caregiverName: assignedCaregiver.name,
        caregiverEmail: assignedCaregiver.email,
        patientId: patient.id,
        type: "REFILL_DUE",
        severity: "warning",
        title: "Low Medication Stock",
        message: `${medication.name} (${medication.dosage}) for ${patient.name} has only ${remQty} units left. Please arrange a refill soon.`,
        patientName: patient.name,
        patientColor: patient.avatarColor,
      });
    }

    return NextResponse.json({ medication });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/medications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
