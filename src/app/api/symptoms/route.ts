import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/notifications";

// GET /api/symptoms?patientId=...&days=...
export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam) : 30;

    const whereClause: any = {
      patient: { caregiverId: user.id },
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
    console.error("GET /api/symptoms error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/symptoms -> Create a new Vitals / Symptom log entry
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Verify patient belongs to caregiver
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, caregiverId: user.id },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const sys = bloodPressureSystolic ? parseInt(bloodPressureSystolic) : null;
    const dia = bloodPressureDiastolic ? parseInt(bloodPressureDiastolic) : null;
    const sugar = bloodSugar ? parseFloat(bloodSugar) : null;
    const hr = heartRate ? parseInt(heartRate) : null;

    const log = await prisma.symptomLog.create({
      data: {
        patientId,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        bloodPressureSystolic: sys,
        bloodPressureDiastolic: dia,
        bloodSugar: sugar,
        heartRate: hr,
        weight: weight ? parseFloat(weight) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        mood: mood || null,
        symptomSeverity: symptomSeverity ? parseInt(symptomSeverity) : null,
        notes: notes || null,
      },
    });

    // Check for abnormal vitals and auto-create a warning alert if needed
    let warningMsg = "";
    if (sys && sys > 140) warningMsg += `High Systolic BP (${sys} mmHg). `;
    if (dia && dia > 90) warningMsg += `High Diastolic BP (${dia} mmHg). `;
    if (sugar && sugar > 180) warningMsg += `High Blood Sugar (${sugar} mg/dL). `;

    if (warningMsg) {
      await prisma.alert.create({
        data: {
          caregiverId: user.id,
          patientId: patient.id,
          type: "VITALS_WARNING",
          title: "Abnormal Vitals Detected",
          message: `Vitals recorded for ${patient.name}: ${warningMsg.trim()}`,
          severity: "danger",
        },
      });

      // Send email notification
      await sendNotificationEmail({
        to: user.email,
        caregiverName: user.name,
        alertType: "VITALS_WARNING",
        severity: "danger",
        title: "Abnormal Vitals Detected",
        message: `Vitals recorded for ${patient.name}: ${warningMsg.trim()} Immediate review recommended.`,
        patientName: patient.name,
        patientColor: patient.avatarColor,
      });
    }

    return NextResponse.json({ log });
  } catch (error) {
    console.error("POST /api/symptoms error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
