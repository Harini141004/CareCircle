import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/access";
import { assertClinicalAccess } from "@/lib/patient-scope";
import { handleApiError } from "@/lib/admin-helpers";
import { ensureDosesForDate, getDoseSettings, computeAdherence } from "@/lib/dose-marking";

// GET /api/doses
// Returns scheduled doses for a patient or caregiver's patients on a target date
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const patientId = url.searchParams.get("patientId");
    const dateParam = url.searchParams.get("date"); // YYYY-MM-DD

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Role-based scoping
    let targetPatientId: string | undefined = undefined;

    if (user.role === "CARETAKER") {
      assertClinicalAccess(user);
      if (patientId && patientId !== "all") {
        // Verify patient belongs to caregiver
        const patient = await prisma.patient.findFirst({
          where: { id: patientId, caregiverId: user.id },
        });
        if (!patient) {
          return NextResponse.json({ error: "Access denied to patient doses" }, { status: 403 });
        }
        targetPatientId = patient.id;
      }
    } else if (user.role === "FAMILY") {
      const family = await prisma.familyMember.findUnique({
        where: { id: user.id },
      });
      if (!family || !family.isActive) {
        return NextResponse.json({ error: "Family account inactive or not found" }, { status: 403 });
      }
      targetPatientId = family.patientId;
    } else if (user.role === "ADMIN") {
      if (patientId && patientId !== "all") {
        targetPatientId = patientId;
      }
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 1. Generate pending doses lazily for today/target date
    if (user.role === "CARETAKER" && targetPatientId) {
      await ensureDosesForDate(targetPatientId, targetDate);
    } else if (user.role === "CARETAKER" && !targetPatientId) {
      const patients = await prisma.patient.findMany({
        where: { caregiverId: user.id, isActive: true },
        select: { id: true },
      });
      for (const p of patients) {
        await ensureDosesForDate(p.id, targetDate);
      }
    } else if (targetPatientId) {
      await ensureDosesForDate(targetPatientId, targetDate);
    }

    // 2. Query doses
    const doses = await prisma.doseLog.findMany({
      where: {
        scheduledFor: {
          gte: startOfDay,
          lte: endOfDay,
        },
        ...(targetPatientId
          ? { patientId: targetPatientId }
          : user.role === "CARETAKER"
          ? { patient: { caregiverId: user.id } }
          : {}),
      },
      include: {
        medication: {
          select: {
            id: true,
            name: true,
            dosage: true,
            frequency: true,
            instructions: true,
            remainingQuantity: true,
            totalQuantity: true,
            refillThreshold: true,
            status: true,
            isActive: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
            caregiverId: true,
          },
        },
      },
      orderBy: {
        scheduledFor: "asc",
      },
    });

    const settings = await getDoseSettings();
    const adherence = computeAdherence(doses, settings.countRefusedInAdherence);

    return NextResponse.json({
      date: startOfDay.toISOString().split("T")[0],
      doses,
      adherence,
      settings: {
        overdueDoseMinutes: settings.overdueDoseMinutes,
        autoMissMinutes: settings.autoMissMinutes,
        doseEditMinutes: settings.doseEditMinutes,
        countRefusedInAdherence: settings.countRefusedInAdherence,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Block POST or PATCH on /api/doses directly
export async function POST() {
  return NextResponse.json({ error: "Use /api/doses/[id]/mark to record a dose" }, { status: 405 });
}
