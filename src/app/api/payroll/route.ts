import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, AccessError } from "@/lib/access";
import { getDoseSettings, computeAdherence } from "@/lib/dose-marking";

function getMonthDateRange(periodStr: string) {
  const [yearStr, monthStr] = periodStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;

  const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { startDate, endDate };
}

export async function GET(req: Request) {
  try {
    const user = await requireRole("CARETAKER");

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const period = searchParams.get("period") || currentPeriod;

    const { startDate, endDate } = getMonthDateRange(period);

    // 1. Fetch stored status from SystemSetting
    const storedSetting = await prisma.systemSetting.findUnique({
      where: { key: "payroll_records" },
    });
    let storedRecords: any[] = [];
    if (storedSetting && storedSetting.value) {
      try {
        storedRecords = JSON.parse(storedSetting.value);
      } catch {
        storedRecords = [];
      }
    }

    const recordKey = `${user.id}_${period}`;
    const existing = storedRecords.find((r) => r.id === recordKey);

    const settings = await getDoseSettings();

    // 2. Fetch caregiver's patients and medication adherence
    const caregiver = await prisma.caregiver.findUnique({
      where: { id: user.id },
      include: {
        patients: {
          select: {
            id: true,
            name: true,
            doseLogs: {
              where: {
                scheduledFor: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              select: { status: true },
            },
          },
        },
      },
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    const allDoses: { status: string }[] = [];
    caregiver.patients.forEach((patient) => {
      patient.doseLogs.forEach((log) => allDoses.push(log));
    });

    const metrics = computeAdherence(allDoses, settings.countRefusedInAdherence);
    const totalDoses = metrics.totalExpected;
    const takenDoses = metrics.takenCount + metrics.takenLateCount;
    const missedDoses = metrics.missedCount;
    const adherenceRate = metrics.adherenceRate;
    const basePay = 1500 + caregiver.patients.length * 300;

    let adherenceBonus = 0;
    let bonusTier = "Standard";
    if (adherenceRate >= 95) {
      adherenceBonus = 300;
      bonusTier = "Tier 1 - Exceptional (>=95%)";
    } else if (adherenceRate >= 85) {
      adherenceBonus = 150;
      bonusTier = "Tier 2 - Target (>=85%)";
    } else {
      adherenceBonus = 0;
      bonusTier = "Below Target (<85%)";
    }

    const totalPay = basePay + adherenceBonus;
    const status = existing ? existing.status : "PENDING";

    // Also get all periods recorded for this caregiver
    const caregiverStoredHistory = storedRecords.filter((r) => r.caregiverId === user.id);

    return NextResponse.json({
      currentPeriodRecord: {
        id: recordKey,
        period,
        status,
        patientsCount: caregiver.patients.length,
        totalDoses,
        takenDoses,
        missedDoses,
        adherenceRate,
        bonusTier,
        basePay,
        adherenceBonus,
        totalPay,
        approvedAt: existing?.approvedAt || null,
        paidAt: existing?.paidAt || null,
        notes: existing?.notes || null,
      },
      history: caregiverStoredHistory,
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/payroll error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
