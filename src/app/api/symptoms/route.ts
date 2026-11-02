import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { patientAccessFilter, assertPatientAccess, assertClinicalAccess } from "@/lib/patient-scope";
import { dispatchCaregiverAlert } from "@/lib/notifications";

function parseOptionalInt(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  const num = parseInt(String(val), 10);
  return Number.isNaN(num) ? null : num;
}

function parseOptionalFloat(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  const num = parseFloat(String(val));
  return Number.isNaN(num) ? null : num;
}

// GET /api/symptoms?patientId=...&days=...
export async function GET(req: Request) {
  try {
    const user = await requireUser();

    if (user.role === "CARETAKER") {
      assertClinicalAccess(user);
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam) : 30;

    const whereClause: any = {
      patient: patientAccessFilter(user),
    };

    if (patientId && patientId !== "all") {
      whereClause.patientId = patientId;
    }

    if (days > 0) {
      const sinceDate = new Date(Date.now() - days * 86400000);
      whereClause.timestamp = { gte: sinceDate };
    }

    const logs = await prisma.symptomLog.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true, avatarColor: true } },
      },
      orderBy: { timestamp: "asc" },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/symptoms error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/symptoms -> Create a new Vitals / Symptom log entry
export async function POST(req: Request) {
  try {
    const user = await requireUser();

    if (user.role === "CARETAKER") {
      assertClinicalAccess(user);
    }

    const body = await req.json();
    const {
      patientId,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      bloodSugar,
      heartRate,
      weight,
      temperature,
      mood,
      symptomSeverity,
      notes,
      timestamp,
    } = body;

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    }

    // Verify patient access with write permission
    const patient = await assertPatientAccess(user, patientId, { write: true });

    // Zero-value preservation: 0 is a valid clinical reading (e.g. pain severity 0, blood sugar 0, etc.)
    const sys = parseOptionalInt(bloodPressureSystolic);
    const dia = parseOptionalInt(bloodPressureDiastolic);
    const sugar = parseOptionalFloat(bloodSugar);
    const hr = parseOptionalInt(heartRate);
    const wt = parseOptionalFloat(weight);
    const temp = parseOptionalFloat(temperature);
    const severity = parseOptionalInt(symptomSeverity);

    const log = await prisma.symptomLog.create({
      data: {
        patientId,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        bloodPressureSystolic: sys,
        bloodPressureDiastolic: dia,
        bloodSugar: sugar,
        heartRate: hr,
        weight: wt,
        temperature: temp,
        mood: mood || null,
        symptomSeverity: severity,
        notes: notes || null,
      },
    });

    // Check for abnormal vitals and auto-create a warning alert if needed
    let warningMsg = "";
    if (sys !== null && sys > 140) warningMsg += `High Systolic BP (${sys} mmHg). `;
    if (dia !== null && dia > 90) warningMsg += `High Diastolic BP (${dia} mmHg). `;
    if (sugar !== null && sugar > 180) warningMsg += `High Blood Sugar (${sugar} mg/dL). `;

    if (warningMsg) {
      const assignedCaregiver = await prisma.caregiver.findUnique({
        where: { id: patient.caregiverId },
      });

      if (assignedCaregiver) {
        await dispatchCaregiverAlert({
          caregiverId: patient.caregiverId,
          caregiverName: assignedCaregiver.name,
          caregiverEmail: assignedCaregiver.email,
          patientId: patient.id,
          type: "VITALS_WARNING",
          severity: "danger",
          title: "Abnormal Vitals Detected",
          message: `Vitals recorded for ${patient.name}: ${warningMsg.trim()} Immediate review recommended.`,
          patientName: patient.name,
          patientColor: patient.avatarColor,
        });
      }
    }

    return NextResponse.json({ log });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/symptoms error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
