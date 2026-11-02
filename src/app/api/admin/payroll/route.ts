import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { handleApiError } from "@/lib/admin-helpers";
import { logAudit } from "@/lib/audit";
import { getDoseSettings, computeAdherence } from "@/lib/dose-marking";
import { z } from "zod";

interface StoredPayrollRecord {
  id: string; // `${caregiverId}_${period}`
  caregiverId: string;
  period: string; // "YYYY-MM"
  status: "PENDING" | "APPROVED" | "PAID";
  basePay: number;
  adherenceBonus: number;
  totalPay: number;
  approvedAt?: string | null;
  approvedBy?: string | null;
  paidAt?: string | null;
  paidBy?: string | null;
  notes?: string | null;
  updatedAt: string;
}

const updatePayrollSchema = z.object({
  caregiverId: z.string().min(1, "Caregiver ID is required"),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM format"),
  status: z.enum(["PENDING", "APPROVED", "PAID"]),
  notes: z.string().optional().nullable(),
});

function getMonthDateRange(periodStr: string) {
  const [yearStr, monthStr] = periodStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed

  const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { startDate, endDate };
}

// GET /api/admin/payroll?period=2026-10&status=ALL&format=json|csv
export async function GET(req: Request) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const period = searchParams.get("period") || currentPeriod;
    const statusFilter = searchParams.get("status") || "ALL";
    const format = searchParams.get("format") || "json";

    const { startDate, endDate } = getMonthDateRange(period);

    // 1. Fetch stored payroll records from SystemSetting
    const storedSetting = await prisma.systemSetting.findUnique({
      where: { key: "payroll_records" },
    });
    let storedRecords: StoredPayrollRecord[] = [];
    if (storedSetting && storedSetting.value) {
      try {
        storedRecords = JSON.parse(storedSetting.value);
      } catch {
        storedRecords = [];
      }
    }

    const settings = await getDoseSettings();

    // 2. Fetch caregivers with their assigned patients and dose logs in date range
    const caregivers = await prisma.caregiver.findMany({
      orderBy: { name: "asc" },
      include: {
        patients: {
          select: {
            id: true,
            name: true,
            isActive: true,
            doseLogs: {
              where: {
                scheduledFor: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    // 3. Compute adherence and compensation per caregiver
    const records = caregivers.map((cg) => {
      const recordKey = `${cg.id}_${period}`;
      const existing = storedRecords.find((r) => r.id === recordKey);

      const allDoses: { status: string }[] = [];
      cg.patients.forEach((patient) => {
        patient.doseLogs.forEach((log) => allDoses.push(log));
      });

      const metrics = computeAdherence(allDoses, settings.countRefusedInAdherence);
      const totalDoses = metrics.totalExpected;
      const takenDoses = metrics.takenCount + metrics.takenLateCount;
      const missedDoses = metrics.missedCount;
      const adherenceRate = metrics.adherenceRate;

      // Base pay: $1,500 standard base + $300 per assigned patient
      const basePay = 1500 + cg.patients.length * 300;

      // Performance adherence tier bonus
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
      const status: "PENDING" | "APPROVED" | "PAID" = existing ? existing.status : "PENDING";

      return {
        id: recordKey,
        caregiverId: cg.id,
        caregiverName: cg.name,
        caregiverEmail: cg.email,
        phone: cg.phone,
        verificationStatus: cg.verificationStatus,
        isActive: cg.isActive,
        period,
        patientsCount: cg.patients.length,
        totalDoses,
        takenDoses,
        missedDoses,
        adherenceRate,
        bonusTier,
        basePay,
        adherenceBonus,
        totalPay,
        status,
        approvedAt: existing?.approvedAt || null,
        approvedBy: existing?.approvedBy || null,
        paidAt: existing?.paidAt || null,
        paidBy: existing?.paidBy || null,
        notes: existing?.notes || null,
        updatedAt: existing?.updatedAt || new Date().toISOString(),
      };
    });

    // 4. Apply status filtering
    const filteredRecords = statusFilter === "ALL"
      ? records
      : records.filter((r) => r.status === statusFilter);

    // 5. Summary calculations
    const summary = {
      period,
      totalCaregivers: records.length,
      totalPayout: records.reduce((acc, r) => acc + r.totalPay, 0),
      pendingCount: records.filter((r) => r.status === "PENDING").length,
      pendingAmount: records.filter((r) => r.status === "PENDING").reduce((acc, r) => acc + r.totalPay, 0),
      approvedCount: records.filter((r) => r.status === "APPROVED").length,
      approvedAmount: records.filter((r) => r.status === "APPROVED").reduce((acc, r) => acc + r.totalPay, 0),
      paidCount: records.filter((r) => r.status === "PAID").length,
      paidAmount: records.filter((r) => r.status === "PAID").reduce((acc, r) => acc + r.totalPay, 0),
    };

    // 6. CSV Export
    if (format === "csv") {
      const csvHeader = [
        "Period",
        "Caregiver ID",
        "Caregiver Name",
        "Email",
        "Assigned Patients",
        "Medication Adherence (%)",
        "Performance Tier",
        "Base Pay ($)",
        "Adherence Bonus ($)",
        "Total Pay ($)",
        "Status",
        "Approved At",
        "Paid At",
        "Notes",
      ].join(",");

      const csvRows = filteredRecords.map((r) =>
        [
          `"${r.period}"`,
          `"${r.caregiverId}"`,
          `"${r.caregiverName.replace(/"/g, '""')}"`,
          `"${r.caregiverEmail}"`,
          r.patientsCount,
          `${r.adherenceRate}%`,
          `"${r.bonusTier}"`,
          r.basePay,
          r.adherenceBonus,
          r.totalPay,
          `"${r.status}"`,
          `"${r.approvedAt || "N/A"}"`,
          `"${r.paidAt || "N/A"}"`,
          `"${(r.notes || "").replace(/"/g, '""')}"`,
        ].join(",")
      );

      const csvContent = [csvHeader, ...csvRows].join("\n");

      return new Response(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="carecircle-payroll-${period}.csv"`,
        },
      });
    }

    return NextResponse.json({
      summary,
      records: filteredRecords,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/admin/payroll
export async function PATCH(req: Request) {
  try {
    const session = await requireRole("ADMIN");
    const json = await req.json();
    const data = updatePayrollSchema.parse(json);

    const caregiver = await prisma.caregiver.findUnique({
      where: { id: data.caregiverId },
      select: { id: true, name: true, email: true },
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    // Load or initialize payroll_records
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "payroll_records" },
    });

    let records: StoredPayrollRecord[] = [];
    if (setting && setting.value) {
      try {
        records = JSON.parse(setting.value);
      } catch {
        records = [];
      }
    }

    const recordKey = `${data.caregiverId}_${data.period}`;
    const nowIso = new Date().toISOString();
    const index = records.findIndex((r) => r.id === recordKey);

    const existingRecord = index >= 0 ? records[index] : null;

    const updatedRecord: StoredPayrollRecord = {
      id: recordKey,
      caregiverId: data.caregiverId,
      period: data.period,
      status: data.status,
      basePay: existingRecord?.basePay ?? 1500,
      adherenceBonus: existingRecord?.adherenceBonus ?? 0,
      totalPay: existingRecord?.totalPay ?? 1500,
      notes: data.notes !== undefined ? data.notes : existingRecord?.notes || null,
      approvedAt:
        data.status === "APPROVED" || data.status === "PAID"
          ? existingRecord?.approvedAt || nowIso
          : null,
      approvedBy:
        data.status === "APPROVED" || data.status === "PAID"
          ? existingRecord?.approvedBy || session.email
          : null,
      paidAt: data.status === "PAID" ? existingRecord?.paidAt || nowIso : null,
      paidBy: data.status === "PAID" ? existingRecord?.paidBy || session.email : null,
      updatedAt: nowIso,
    };

    if (index >= 0) {
      records[index] = updatedRecord;
    } else {
      records.push(updatedRecord);
    }

    await prisma.systemSetting.upsert({
      where: { key: "payroll_records" },
      update: {
        value: JSON.stringify(records),
        updatedById: session.id,
      },
      create: {
        key: "payroll_records",
        value: JSON.stringify(records),
        updatedById: session.id,
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: session.id,
      action: "UPDATE_PAYROLL_STATUS",
      targetType: "Caregiver",
      targetId: caregiver.id,
      summary: `Admin updated payroll for ${caregiver.name} (${data.period}) to status ${data.status}`,
    });

    return NextResponse.json({
      success: true,
      record: updatedRecord,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
