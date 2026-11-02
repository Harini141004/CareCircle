import { prisma } from "@/lib/prisma";
import { AccessError } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import { sendNotificationEmail, AlertSeverity } from "@/lib/notifications";

export interface DoseSettings {
  overdueDoseMinutes: number;
  autoMissMinutes: number;
  doseEditMinutes: number;
  countRefusedInAdherence: boolean;
  refillWarningDays: number;
  alertEscalationHours: number;
  alertRecipientEmails: string[];
}

/**
 * Fetch system settings with resilient fallbacks
 */
export async function getDoseSettings(): Promise<DoseSettings> {
  try {
    const records = await prisma.systemSetting.findMany();
    const map = new Map<string, string>();
    records.forEach((r) => map.set(r.key, r.value));

    const parseNum = (k: string, def: number): number => {
      const v = map.get(k);
      if (!v) return def;
      try {
        const val = JSON.parse(v);
        return typeof val === "number" && !isNaN(val) ? val : def;
      } catch {
        return def;
      }
    };

    const parseBool = (k: string, def: boolean): boolean => {
      const v = map.get(k);
      if (!v) return def;
      try {
        const val = JSON.parse(v);
        return typeof val === "boolean" ? val : def;
      } catch {
        return def;
      }
    };

    const parseArray = (k: string, def: string[]): string[] => {
      const v = map.get(k);
      if (!v) return def;
      try {
        const val = JSON.parse(v);
        return Array.isArray(val) ? val : def;
      } catch {
        return def;
      }
    };

    return {
      overdueDoseMinutes: parseNum("overdueDoseMinutes", 60),
      autoMissMinutes: parseNum("autoMissMinutes", 120),
      doseEditMinutes: parseNum("doseEditMinutes", 30),
      countRefusedInAdherence: parseBool("countRefusedInAdherence", false),
      refillWarningDays: parseNum("refillWarningDays", 7),
      alertEscalationHours: parseNum("alertEscalationHours", 24),
      alertRecipientEmails: parseArray("alertRecipientEmails", ["admin@carecircle.demo"]),
    };
  } catch (err) {
    console.error("Failed to read system settings, applying defaults:", err);
    return {
      overdueDoseMinutes: 60,
      autoMissMinutes: 120,
      doseEditMinutes: 30,
      countRefusedInAdherence: false,
      refillWarningDays: 7,
      alertEscalationHours: 24,
      alertRecipientEmails: ["admin@carecircle.demo"],
    };
  }
}

/**
 * Parses timesOfDay string (e.g. '["08:00", "20:00"]' or '08:00') into string array
 */
export function parseTimesOfDay(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((t) => String(t).trim());
    }
  } catch {
    // If not JSON array, might be comma-separated or single string
    if (raw.includes(",")) {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (raw.trim()) {
      return [raw.trim()];
    }
  }
  return ["08:00"];
}

/**
 * Format time display e.g. "8:00 AM"
 */
export function formatTimeDisplay(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Categorize dose time into Morning / Afternoon / Evening / Night
 */
export function getTimeSlot(date: Date): "Morning" | "Afternoon" | "Evening" | "Night" {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

/**
 * Ensure PENDING doses exist for active medications on target date
 */
export async function ensureDosesForDate(patientId?: string, targetDate = new Date()): Promise<void> {
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Fetch active medications
  const medications = await prisma.medication.findMany({
    where: {
      status: "ACTIVE",
      isActive: true,
      ...(patientId ? { patientId } : {}),
    },
    include: {
      patient: true,
    },
  });

  for (const med of medications) {
    // Check medication start and end date validity
    if (med.startDate && med.startDate > endOfDay) {
      continue; // Hasn't started yet
    }
    if (med.endDate && med.endDate < startOfDay) {
      continue; // Already ended
    }

    const times = parseTimesOfDay(med.timesOfDay);

    for (const timeStr of times) {
      const [hStr, mStr] = timeStr.split(":");
      const hours = parseInt(hStr || "8", 10);
      const minutes = parseInt(mStr || "0", 10);

      const scheduledFor = new Date(startOfDay);
      scheduledFor.setHours(hours, minutes, 0, 0);

      try {
        await prisma.doseLog.upsert({
          where: {
            medicationId_scheduledFor: {
              medicationId: med.id,
              scheduledFor,
            },
          },
          update: {},
          create: {
            medicationId: med.id,
            patientId: med.patientId,
            scheduledFor,
            status: "PENDING",
          },
        });
      } catch (e) {
        // Upsert handles unique collision gracefully
      }
    }
  }

  // 2. Trigger auto-miss background evaluation
  await runAutoMissEvaluation(patientId);
}

/**
 * Automatically marks PENDING doses as MISSED when scheduledFor + autoMissMinutes < now
 */
export async function runAutoMissEvaluation(patientId?: string): Promise<number> {
  const settings = await getDoseSettings();
  const now = new Date();
  const autoMissCutoff = new Date(now.getTime() - settings.autoMissMinutes * 60 * 1000);

  // Find overdue pending doses
  const pendingExpiredDoses = await prisma.doseLog.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: autoMissCutoff },
      ...(patientId ? { patientId } : {}),
    },
    include: {
      medication: true,
      patient: {
        include: {
          caregiver: true,
          familyMembers: true,
        },
      },
    },
  });

  let transitionedCount = 0;

  for (const dose of pendingExpiredDoses) {
    // Update dose to MISSED
    await prisma.doseLog.update({
      where: { id: dose.id },
      data: {
        status: "MISSED",
        loggedByType: "SYSTEM",
        loggedById: "system",
        loggedAt: now,
        reason: `Automatically marked MISSED: grace period (${settings.autoMissMinutes}m) exceeded`,
      },
    });

    transitionedCount++;

    // Create system alert
    const timeFormatted = formatTimeDisplay(dose.scheduledFor);
    const alertMsg = `${dose.patient.name} missed their ${timeFormatted} ${dose.medication.name}. Reason: Auto-missed (grace period exceeded).`;

    await dispatchDoseNotification({
      patientId: dose.patientId,
      caregiverId: dose.patient.caregiverId,
      caregiverName: dose.patient.caregiver.name,
      caregiverEmail: dose.patient.caregiver.email,
      patientName: dose.patient.name,
      patientAvatarColor: dose.patient.avatarColor,
      medicationName: dose.medication.name,
      scheduledFor: dose.scheduledFor,
      status: "MISSED",
      reason: `Auto-missed after ${settings.autoMissMinutes} minutes grace period`,
      loggedByName: "System",
      severity: "warning",
    });

    // Write audit log
    await logAudit({
      actorType: "SYSTEM",
      actorId: "system",
      action: "DOSE_AUTO_MISSED",
      targetType: "DoseLog",
      targetId: dose.id,
      summary: `System auto-missed dose of ${dose.medication.name} for ${dose.patient.name}`,
    });
  }

  return transitionedCount;
}

/**
 * Dispatch notifications for MISSED or REFUSED doses
 * Notifies primary contact (email if permitted), other family in-app, and checks 7-day repeated non-adherence
 */
export async function dispatchDoseNotification(params: {
  patientId: string;
  caregiverId: string;
  caregiverName: string;
  caregiverEmail: string;
  patientName: string;
  patientAvatarColor?: string;
  medicationName: string;
  scheduledFor: Date;
  status: "MISSED" | "REFUSED";
  reason?: string | null;
  loggedByName: string;
  severity?: AlertSeverity;
}): Promise<void> {
  const timeFormatted = formatTimeDisplay(params.scheduledFor);
  const title = `${params.medicationName} ${params.status === "REFUSED" ? "Refused" : "Missed"}`;
  const actionWord = params.status === "REFUSED" ? "refused" : "missed";
  const reasonText = params.reason ? ` Reason: ${params.reason}.` : "";
  const message = `${params.patientName} ${actionWord} their ${timeFormatted} ${params.medicationName}.${reasonText} Logged by ${params.loggedByName}.`;

  // 1. Create In-App Alert for Caregiver & Patient
  await prisma.alert.create({
    data: {
      caregiverId: params.caregiverId,
      patientId: params.patientId,
      type: "MISSED_MED",
      title,
      message,
      severity: params.severity || "warning",
    },
  });

  // 2. Fetch family members
  const familyMembers = await prisma.familyMember.findMany({
    where: { patientId: params.patientId, isActive: true },
  });

  // Find primary contact
  const primaryContact = familyMembers.find((f) => f.isPrimaryContact) || familyMembers[0];

  if (primaryContact) {
    // Check primary contact notification preference
    const pref = await prisma.notificationPreference.findUnique({
      where: {
        userType_userId: {
          userType: "FAMILY",
          userId: primaryContact.id,
        },
      },
    });

    const emailAllowed = pref ? pref.emailAlerts && pref.notifyMissedMed : true;

    if (emailAllowed) {
      await sendNotificationEmail({
        to: primaryContact.email,
        caregiverName: primaryContact.name,
        alertType: "MISSED_MED",
        severity: params.severity || "warning",
        title,
        message,
        patientName: params.patientName,
        patientColor: params.patientAvatarColor,
      });
    }
  }

  // 3. Repeated problems check: 3 MISSED or REFUSED in 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const nonAdherentCount = await prisma.doseLog.count({
    where: {
      patientId: params.patientId,
      status: { in: ["MISSED", "REFUSED"] },
      scheduledFor: { gte: sevenDaysAgo },
    },
  });

  if (nonAdherentCount >= 3) {
    // Create high-priority critical alert visible to Admin and Caregiver
    await prisma.alert.create({
      data: {
        caregiverId: params.caregiverId,
        patientId: params.patientId,
        type: "MISSED_MED",
        title: `🚨 Repeated Non-Adherence: ${params.patientName}`,
        message: `${params.patientName} has had ${nonAdherentCount} missed or refused doses in the last 7 days. Urgent clinical follow-up required.`,
        severity: "danger",
      },
    });

    await logAudit({
      actorType: "SYSTEM",
      actorId: "system",
      action: "REPEATED_NON_ADHERENCE_ESCALATED",
      targetType: "Patient",
      targetId: params.patientId,
      summary: `Escalated high-priority alert: ${params.patientName} reached ${nonAdherentCount} missed/refused doses in 7 days`,
    });
  }
}

/**
 * Adherence score computation
 * Formula: (TAKEN + TAKEN_LATE) / expectedDoses
 * SKIPPED is always excluded.
 * If countRefusedInAdherence is false: REFUSED is excluded from expected doses so caregiver is not penalized.
 * If countRefusedInAdherence is true: REFUSED is counted in expected doses.
 */
export function computeAdherence(
  doses: { status: string }[],
  countRefusedInAdherence = false
): {
  adherenceRate: number;
  totalExpected: number;
  takenCount: number;
  takenLateCount: number;
  missedCount: number;
  refusedCount: number;
  skippedCount: number;
  pendingCount: number;
} {
  let takenCount = 0;
  let takenLateCount = 0;
  let missedCount = 0;
  let refusedCount = 0;
  let skippedCount = 0;
  let pendingCount = 0;

  for (const d of doses) {
    switch (d.status) {
      case "TAKEN":
        takenCount++;
        break;
      case "TAKEN_LATE":
        takenLateCount++;
        break;
      case "MISSED":
        missedCount++;
        break;
      case "REFUSED":
        refusedCount++;
        break;
      case "SKIPPED":
        skippedCount++;
        break;
      case "PENDING":
        pendingCount++;
        break;
      default:
        break;
    }
  }

  const compliantDoses = takenCount + takenLateCount;

  // Expected doses:
  // Base = TAKEN + TAKEN_LATE + MISSED
  // If countRefusedInAdherence is true, add REFUSED; else exclude REFUSED from denominator
  let totalExpected = compliantDoses + missedCount;
  if (countRefusedInAdherence) {
    totalExpected += refusedCount;
  }

  const adherenceRate = totalExpected > 0 ? Math.round((compliantDoses / totalExpected) * 100) : 100;

  return {
    adherenceRate,
    totalExpected,
    takenCount,
    takenLateCount,
    missedCount,
    refusedCount,
    skippedCount,
    pendingCount,
  };
}
