import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { handleApiError } from "@/lib/admin-helpers";
import { getDoseSettings, computeAdherence } from "@/lib/dose-marking";

// GET /api/admin/reports?days=7|30|90|all&format=json|csv
export async function GET(req: Request) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days") || "30";
    const format = searchParams.get("format") || "json";

    let dateFilter: any = {};
    if (daysParam !== "all") {
      const days = parseInt(daysParam, 10) || 30;
      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      dateFilter = { gte: sinceDate };
    }

    const settings = await getDoseSettings();

    const [caregivers, patients, totalMedicationLogs] = await Promise.all([
      prisma.caregiver.findMany({
        orderBy: { name: "asc" },
        include: {
          patients: {
            select: {
              id: true,
              name: true,
              doseLogs: {
                where: dateFilter.gte ? { scheduledFor: dateFilter } : undefined,
                select: { status: true },
              },
            },
          },
          alerts: {
            where: { isRead: false },
            select: { id: true },
          },
        },
      }),
      prisma.patient.findMany({
        select: {
          id: true,
          name: true,
          isActive: true,
          caregiver: { select: { id: true, name: true } },
          familyMembers: { select: { id: true, isPrimaryContact: true } },
        },
      }),
      prisma.doseLog.count({
        where: dateFilter.gte ? { scheduledFor: dateFilter } : undefined,
      }),
    ]);

    // Compute caregiver metrics
    const caregiverMetrics = caregivers.map((cg) => {
      const allDoses: { status: string }[] = [];
      cg.patients.forEach((p) => {
        p.doseLogs.forEach((log) => allDoses.push(log));
      });

      const metrics = computeAdherence(allDoses, settings.countRefusedInAdherence);

      return {
        id: cg.id,
        name: cg.name,
        email: cg.email,
        verificationStatus: cg.verificationStatus,
        patientsCount: cg.patients.length,
        openAlertsCount: cg.alerts.length,
        totalDoses: metrics.totalExpected,
        takenDoses: metrics.takenCount + metrics.takenLateCount,
        missedDoses: metrics.missedCount,
        refusedDoses: metrics.refusedCount,
        skippedDoses: metrics.skippedCount,
        adherenceRate: metrics.adherenceRate,
      };
    });

    // Compute patient coverage
    const totalPatients = patients.length;
    const withPrimaryContact = patients.filter((p) =>
      p.familyMembers.some((fm) => fm.isPrimaryContact)
    ).length;
    const withAnyFamily = patients.filter((p) => p.familyMembers.length > 0).length;
    const unassignedPatients = patients.filter((p) => !p.caregiver).length;

    // Return CSV export if requested
    if (format === "csv") {
      const csvHeader = [
        "Caregiver Name",
        "Email",
        "Verification Status",
        "Assigned Patients",
        "Total Doses Scheduled",
        "Doses Taken",
        "Doses Missed",
        "Doses Skipped",
        "Adherence Rate (%)",
        "Open Alerts",
      ].join(",");

      const csvRows = caregiverMetrics.map((c) =>
        [
          `"${c.name}"`,
          `"${c.email}"`,
          c.verificationStatus,
          c.patientsCount,
          c.totalDoses,
          c.takenDoses,
          c.missedDoses,
          c.skippedDoses,
          `${c.adherenceRate}%`,
          c.openAlertsCount,
        ].join(",")
      );

      const csvContent = [csvHeader, ...csvRows].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="caregiver-performance-${daysParam}-days.csv"`,
        },
      });
    }

    return NextResponse.json({
      periodDays: daysParam,
      totalMedicationLogs,
      caregivers: caregiverMetrics,
      patientCoverage: {
        totalPatients,
        withPrimaryContact,
        withAnyFamily,
        withoutFamily: totalPatients - withAnyFamily,
        unassignedPatients,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
