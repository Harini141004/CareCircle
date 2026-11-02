import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { handleApiError } from "@/lib/admin-helpers";
import { logAudit } from "@/lib/audit";
import fs from "fs";
import path from "path";

function getSqliteDbPath(): string | null {
  const possiblePaths = [
    path.resolve(process.cwd(), "dev.db"),
    path.resolve(process.cwd(), "prisma/dev.db"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
      return p;
    }
  }
  return null;
}

// GET /api/admin/data?export=users|reports|audit|json
export async function GET(req: Request) {
  try {
    const session = await requireRole("ADMIN");
    const { searchParams } = new URL(req.url);
    const exportType = searchParams.get("export");

    // 1. Export Handlers
    if (exportType === "users") {
      const [admins, caregivers, patients, familyMembers] = await Promise.all([
        prisma.admin.findMany({ orderBy: { name: "asc" } }),
        prisma.caregiver.findMany({ orderBy: { name: "asc" } }),
        prisma.patient.findMany({
          orderBy: { name: "asc" },
          include: { caregiver: { select: { name: true } } },
        }),
        prisma.familyMember.findMany({
          orderBy: { name: "asc" },
          include: { patient: { select: { name: true } } },
        }),
      ]);

      const csvHeader = [
        "User Type",
        "ID",
        "Name",
        "Email",
        "Phone",
        "Active",
        "Role / Relationship",
        "Associated With",
        "Last Login",
        "Created At",
      ].join(",");

      const rows: string[] = [];

      admins.forEach((a) => {
        rows.push(
          [
            '"Admin"',
            `"${a.id}"`,
            `"${a.name.replace(/"/g, '""')}"`,
            `"${a.email}"`,
            `"${a.phone || "N/A"}"`,
            a.isActive ? "Yes" : "No",
            '"System Administrator"',
            '"Platform"',
            `"${a.lastLoginAt ? a.lastLoginAt.toISOString() : "Never"}"`,
            `"${a.createdAt.toISOString()}"`,
          ].join(",")
        );
      });

      caregivers.forEach((c) => {
        rows.push(
          [
            '"Caregiver"',
            `"${c.id}"`,
            `"${c.name.replace(/"/g, '""')}"`,
            `"${c.email}"`,
            `"${c.phone || "N/A"}"`,
            c.isActive ? "Yes" : "No",
            `"Caregiver (${c.verificationStatus})"`,
            '"Assigned Patients"',
            `"${c.lastLoginAt ? c.lastLoginAt.toISOString() : "Never"}"`,
            `"${c.createdAt.toISOString()}"`,
          ].join(",")
        );
      });

      patients.forEach((p) => {
        rows.push(
          [
            '"Patient"',
            `"${p.id}"`,
            `"${p.name.replace(/"/g, '""')}"`,
            '"N/A"',
            `"${p.emergencyContact || "N/A"}"`,
            p.isActive ? "Yes" : "No",
            `"Patient (${p.relationship})"`,
            `"${(p.caregiver?.name || "Unassigned").replace(/"/g, '""')}"`,
            '"N/A"',
            `"${p.createdAt.toISOString()}"`,
          ].join(",")
        );
      });

      familyMembers.forEach((fm) => {
        rows.push(
          [
            '"Family Member"',
            `"${fm.id}"`,
            `"${fm.name.replace(/"/g, '""')}"`,
            `"${fm.email}"`,
            `"${fm.phone || "N/A"}"`,
            fm.isActive ? "Yes" : "No",
            `"${fm.relationship}${fm.isPrimaryContact ? " (Primary)" : ""}"`,
            `"${(fm.patient?.name || "Unknown").replace(/"/g, '""')}"`,
            `"${fm.lastLoginAt ? fm.lastLoginAt.toISOString() : "Never"}"`,
            `"${fm.createdAt.toISOString()}"`,
          ].join(",")
        );
      });

      await logAudit({
        actorType: "ADMIN",
        actorId: session.id,
        action: "DATA_EXPORT",
        targetType: "Users",
        summary: `Admin exported complete users roster CSV (${rows.length} records)`,
      });

      return new Response([csvHeader, ...rows].join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="carecircle-users-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    if (exportType === "audit") {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 2000,
      });

      const csvHeader = [
        "Timestamp",
        "Actor Type",
        "Actor ID",
        "Action",
        "Target Type",
        "Target ID",
        "Summary",
        "IP Address",
      ].join(",");

      const rows = logs.map((l) =>
        [
          `"${l.createdAt.toISOString()}"`,
          `"${l.actorType}"`,
          `"${l.actorId}"`,
          `"${l.action}"`,
          `"${l.targetType}"`,
          `"${l.targetId || ""}"`,
          `"${l.summary.replace(/"/g, '""')}"`,
          `"${l.ip || ""}"`,
        ].join(",")
      );

      await logAudit({
        actorType: "ADMIN",
        actorId: session.id,
        action: "DATA_EXPORT",
        targetType: "AuditLog",
        summary: `Admin exported system audit trail CSV (${rows.length} records)`,
      });

      return new Response([csvHeader, ...rows].join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="carecircle-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    if (exportType === "json") {
      const [
        admins,
        caregivers,
        patients,
        familyMembers,
        medications,
        appointments,
        alerts,
        auditLogs,
        systemSettings,
      ] = await Promise.all([
        prisma.admin.findMany({ select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true } }),
        prisma.caregiver.findMany({ select: { id: true, name: true, email: true, phone: true, verificationStatus: true, isActive: true, createdAt: true } }),
        prisma.patient.findMany(),
        prisma.familyMember.findMany({ select: { id: true, patientId: true, name: true, email: true, phone: true, relationship: true, isPrimaryContact: true, isActive: true, createdAt: true } }),
        prisma.medication.findMany(),
        prisma.appointment.findMany(),
        prisma.alert.findMany(),
        prisma.auditLog.findMany({ take: 500, orderBy: { createdAt: "desc" } }),
        prisma.systemSetting.findMany(),
      ]);

      const snapshot = {
        exportedAt: new Date().toISOString(),
        exportedBy: session.email,
        counts: {
          admins: admins.length,
          caregivers: caregivers.length,
          patients: patients.length,
          familyMembers: familyMembers.length,
          medications: medications.length,
          appointments: appointments.length,
          alerts: alerts.length,
          auditLogs: auditLogs.length,
          systemSettings: systemSettings.length,
        },
        data: {
          admins,
          caregivers,
          patients,
          familyMembers,
          medications,
          appointments,
          alerts,
          auditLogs,
          systemSettings,
        },
      };

      await logAudit({
        actorType: "ADMIN",
        actorId: session.id,
        action: "DATA_EXPORT",
        targetType: "SystemSnapshot",
        summary: "Admin exported full system JSON snapshot",
      });

      return new Response(JSON.stringify(snapshot, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="carecircle-snapshot-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
    }

    // 2. Default: Return metadata and database telemetry
    const dbPath = getSqliteDbPath();
    let dbStats: { exists: boolean; sizeBytes: number; sizeFormatted: string; lastModified: string | null; path: string | null } = {
      exists: false,
      sizeBytes: 0,
      sizeFormatted: "0 KB",
      lastModified: null,
      path: null,
    };

    if (dbPath && fs.existsSync(/*turbopackIgnore: true*/ dbPath)) {
      const stat = fs.statSync(/*turbopackIgnore: true*/ dbPath);
      const sizeKb = (stat.size / 1024).toFixed(1);
      const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
      dbStats = {
        exists: true,
        sizeBytes: stat.size,
        sizeFormatted: stat.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`,
        lastModified: stat.mtime.toISOString(),
        path: path.basename(dbPath),
      };
    }

    // Table Counts
    const [
      adminCount,
      caregiverCount,
      patientCount,
      familyCount,
      medicationCount,
      medicationLogCount,
      symptomLogCount,
      appointmentCount,
      alertCount,
      auditLogCount,
      loginAttemptCount,
      conversationCount,
      messageCount,
      careNoteCount,
    ] = await Promise.all([
      prisma.admin.count(),
      prisma.caregiver.count(),
      prisma.patient.count(),
      prisma.familyMember.count(),
      prisma.medication.count(),
      prisma.doseLog.count(),
      prisma.symptomLog.count(),
      prisma.appointment.count(),
      prisma.alert.count(),
      prisma.auditLog.count(),
      prisma.loginAttempt.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.careNote.count(),
    ]);

    const counts = {
      admins: adminCount,
      caregivers: caregiverCount,
      patients: patientCount,
      familyMembers: familyCount,
      medications: medicationCount,
      medicationLogs: medicationLogCount,
      symptomLogs: symptomLogCount,
      appointments: appointmentCount,
      alerts: alertCount,
      auditLogs: auditLogCount,
      loginAttempts: loginAttemptCount,
      conversations: conversationCount,
      messages: messageCount,
      careNotes: careNoteCount,
    };

    return NextResponse.json({
      database: {
        engine: "SQLite",
        file: dbStats,
      },
      counts,
      lastBackupDate: dbStats.lastModified,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
