import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { handleApiError } from "@/lib/admin-helpers";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const settingsSchema = z.object({
  overdueDoseMinutes: z.number().int().min(5, "Minimum threshold is 5 minutes").max(1440, "Maximum is 24 hours (1440 min)"),
  refillWarningDays: z.number().int().min(1, "Minimum is 1 day").max(60, "Maximum is 60 days"),
  alertEscalationHours: z.number().int().min(1, "Minimum is 1 hour").max(168, "Maximum is 7 days (168 hours)"),
  alertRecipientEmails: z.array(z.string().email("Invalid recipient email")).min(1, "At least one recipient email is required"),
  autoMissMinutes: z.number().int().min(10, "Minimum is 10 minutes").max(1440, "Maximum is 1440 minutes").optional(),
  doseEditMinutes: z.number().int().min(5, "Minimum is 5 minutes").max(180, "Maximum is 180 minutes").optional(),
  countRefusedInAdherence: z.boolean().optional(),
});

// GET /api/admin/settings
export async function GET() {
  try {
    await requireRole("ADMIN");

    const settings = await prisma.systemSetting.findMany();

    const settingMap = new Map<string, { value: string; updatedAt: Date; updatedById: string | null }>();
    settings.forEach((s) => settingMap.set(s.key, { value: s.value, updatedAt: s.updatedAt, updatedById: s.updatedById }));

    const parseSetting = <T>(key: string, defaultValue: T): T => {
      const entry = settingMap.get(key);
      if (!entry) return defaultValue;
      try {
        return JSON.parse(entry.value) as T;
      } catch {
        return defaultValue;
      }
    };

    const overdueDoseMinutes = parseSetting<number>("overdueDoseMinutes", 60);
    const refillWarningDays = parseSetting<number>("refillWarningDays", 7);
    const alertEscalationHours = parseSetting<number>("alertEscalationHours", 24);
    const alertRecipientEmails = parseSetting<string[]>("alertRecipientEmails", ["admin@carecircle.demo"]);
    const autoMissMinutes = parseSetting<number>("autoMissMinutes", 120);
    const doseEditMinutes = parseSetting<number>("doseEditMinutes", 30);
    const countRefusedInAdherence = parseSetting<boolean>("countRefusedInAdherence", false);

    // Find the latest update timestamp
    let latestUpdatedAt: Date | null = null;
    let latestUpdatedById: string | null = null;
    settings.forEach((s) => {
      if (!latestUpdatedAt || s.updatedAt > latestUpdatedAt) {
        latestUpdatedAt = s.updatedAt;
        latestUpdatedById = s.updatedById;
      }
    });

    return NextResponse.json({
      settings: {
        overdueDoseMinutes,
        refillWarningDays,
        alertEscalationHours,
        alertRecipientEmails,
        autoMissMinutes,
        doseEditMinutes,
        countRefusedInAdherence,
      },
      updatedAt: latestUpdatedAt,
      updatedById: latestUpdatedById,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/admin/settings
export async function PUT(req: Request) {
  try {
    const session = await requireRole("ADMIN");
    const json = await req.json();
    const data = settingsSchema.parse(json);

    const keysToUpdate: { key: string; value: string }[] = [
      { key: "overdueDoseMinutes", value: JSON.stringify(data.overdueDoseMinutes) },
      { key: "refillWarningDays", value: JSON.stringify(data.refillWarningDays) },
      { key: "alertEscalationHours", value: JSON.stringify(data.alertEscalationHours) },
      { key: "alertRecipientEmails", value: JSON.stringify(data.alertRecipientEmails) },
    ];

    if (data.autoMissMinutes !== undefined) {
      keysToUpdate.push({ key: "autoMissMinutes", value: JSON.stringify(data.autoMissMinutes) });
    }
    if (data.doseEditMinutes !== undefined) {
      keysToUpdate.push({ key: "doseEditMinutes", value: JSON.stringify(data.doseEditMinutes) });
    }
    if (data.countRefusedInAdherence !== undefined) {
      keysToUpdate.push({ key: "countRefusedInAdherence", value: JSON.stringify(data.countRefusedInAdherence) });
    }

    await Promise.all(
      keysToUpdate.map((item) =>
        prisma.systemSetting.upsert({
          where: { key: item.key },
          update: {
            value: item.value,
            updatedById: session.id,
          },
          create: {
            key: item.key,
            value: item.value,
            updatedById: session.id,
          },
        })
      )
    );

    await logAudit({
      actorType: "ADMIN",
      actorId: session.id,
      action: "UPDATE_SYSTEM_SETTINGS",
      targetType: "SystemSetting",
      targetId: "global",
      summary: `Admin updated system thresholds (Overdue: ${data.overdueDoseMinutes}m, Refill: ${data.refillWarningDays}d, Escalation: ${data.alertEscalationHours}h, Recipients: ${data.alertRecipientEmails.join(", ")})`,
    });

    return NextResponse.json({
      success: true,
      settings: data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
