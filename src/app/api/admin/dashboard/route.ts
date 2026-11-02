import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { handleApiError } from "@/lib/admin-helpers";

export async function GET() {
  try {
    await requireRole("ADMIN");

    // Fetch escalation hours setting (default 24h)
    const escalationSetting = await prisma.systemSetting.findUnique({
      where: { key: "alertEscalationHours" },
    });
    const escalationHours = escalationSetting ? JSON.parse(escalationSetting.value) : 24;
    const escalationThreshold = new Date(Date.now() - escalationHours * 60 * 60 * 1000);

    const [
      caregiversCount,
      activeCaregiversCount,
      patientsCount,
      activePatientsCount,
      familyCount,
      pendingVerifications,
      inactiveAdmins,
      inactiveCaregivers,
      inactivePatients,
      inactiveFamily,
      escalatedAlertsCount,
      pendingCaregivers,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.caregiver.count(),
      prisma.caregiver.count({ where: { isActive: true } }),
      prisma.patient.count(),
      prisma.patient.count({ where: { isActive: true } }),
      prisma.familyMember.count(),
      prisma.caregiver.count({ where: { verificationStatus: "PENDING" } }),
      prisma.admin.count({ where: { isActive: false } }),
      prisma.caregiver.count({ where: { isActive: false } }),
      prisma.patient.count({ where: { isActive: false } }),
      prisma.familyMember.count({ where: { isActive: false } }),
      prisma.alert.count({
        where: {
          isRead: false,
          createdAt: { lte: escalationThreshold },
        },
      }),
      prisma.caregiver.findMany({
        where: { verificationStatus: "PENDING" },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          education: true,
          previousExperience: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalInactiveUsers =
      inactiveAdmins + inactiveCaregivers + inactivePatients + inactiveFamily;

    return NextResponse.json({
      stats: {
        caregivers: caregiversCount,
        activeCaregivers: activeCaregiversCount,
        patients: patientsCount,
        activePatients: activePatientsCount,
        familyMembers: familyCount,
        pendingVerifications,
        inactiveUsers: totalInactiveUsers,
        escalatedAlerts: escalatedAlertsCount,
        escalationHours,
      },
      pendingCaregivers,
      recentAuditLogs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
