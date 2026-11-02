import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { assertPatientAccess } from "@/lib/patient-scope";

// GET /api/reports/[patientId] -> Aggregates adherence data, vitals trends, and checklist items for doctor visit
export async function GET(
  req: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const user = await requireUser();
    const { patientId } = await params;

    // Verify patient access (read permitted for all authorized roles including FAMILY)
    await assertPatientAccess(user, patientId);

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        caregiver: { select: { name: true, email: true } },
        medications: {
          include: {
            logs: {
              where: {
                scheduledFor: {
                  gte: new Date(Date.now() - 30 * 86400000), // past 30 days
                },
              },
              orderBy: { scheduledFor: "desc" },
            },
          },
        },
        symptomLogs: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 30 * 86400000),
            },
          },
          orderBy: { timestamp: "desc" },
        },
        appointments: {
          where: { status: "UPCOMING" },
          orderBy: { dateTime: "asc" },
          take: 1,
          include: { checklistItems: true },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Calculate medication adherence rates
    const medAdherence = patient.medications.map((med) => {
      const totalLogs = med.logs.length;
      const takenLogs = med.logs.filter((l) => l.status === "TAKEN").length;
      const missedLogs = med.logs.filter((l) => l.status === "MISSED").length;
      const adherenceRate = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 100;

      return {
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        prescribingDoctor: med.prescribingDoctor,
        totalLogs,
        takenLogs,
        missedLogs,
        adherenceRate,
        remainingQuantity: med.remainingQuantity,
        refillThreshold: med.refillThreshold,
      };
    });

    // Overall Adherence Score
    const totalDoses = medAdherence.reduce((acc, m) => acc + m.totalLogs, 0);
    const totalTaken = medAdherence.reduce((acc, m) => acc + m.takenLogs, 0);
    const overallAdherenceScore = totalDoses > 0 ? Math.round((totalTaken / totalDoses) * 100) : 100;

    // Vitals Aggregates (past 30 days)
    const bpSystolicList = patient.symptomLogs
      .map((l) => l.bloodPressureSystolic)
      .filter((v): v is number => v !== null);
    const bpDiastolicList = patient.symptomLogs
      .map((l) => l.bloodPressureDiastolic)
      .filter((v): v is number => v !== null);
    const sugarList = patient.symptomLogs
      .map((l) => l.bloodSugar)
      .filter((v): v is number => v !== null);
    const hrList = patient.symptomLogs
      .map((l) => l.heartRate)
      .filter((v): v is number => v !== null);

    const calcAvg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
    const calcMin = (arr: number[]) => (arr.length > 0 ? Math.min(...arr) : null);
    const calcMax = (arr: number[]) => (arr.length > 0 ? Math.max(...arr) : null);

    const vitalsSummary = {
      systolic: { avg: calcAvg(bpSystolicList), min: calcMin(bpSystolicList), max: calcMax(bpSystolicList) },
      diastolic: { avg: calcAvg(bpDiastolicList), min: calcMin(bpDiastolicList), max: calcMax(bpDiastolicList) },
      bloodSugar: { avg: calcAvg(sugarList), min: calcMin(sugarList), max: calcMax(sugarList) },
      heartRate: { avg: calcAvg(hrList), min: calcMin(hrList), max: calcMax(hrList) },
      totalLogEntries: patient.symptomLogs.length,
    };

    const nextAppointment = patient.appointments[0] || null;

    return NextResponse.json({
      report: {
        generatedAt: new Date().toISOString(),
        caregiver: patient.caregiver,
        patient: {
          id: patient.id,
          name: patient.name,
          dob: patient.dob,
          gender: patient.gender,
          relationship: patient.relationship,
          primaryCondition: patient.primaryCondition,
          bloodType: patient.bloodType,
          allergies: patient.allergies,
          emergencyContact: patient.emergencyContact,
          notes: patient.notes,
        },
        medAdherence,
        overallAdherenceScore,
        vitalsSummary,
        recentSymptomLogs: patient.symptomLogs.slice(0, 10),
        nextAppointment,
      },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/reports/[patientId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
