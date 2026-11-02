import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";
import { assertClinicalAccess } from "@/lib/patient-scope";
import { handleApiError } from "@/lib/admin-helpers";
import { logAudit } from "@/lib/audit";
import { getDoseSettings } from "@/lib/dose-marking";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["TAKEN", "TAKEN_LATE", "MISSED", "REFUSED", "SKIPPED"]),
  takenAt: z.string().datetime().optional().nullable(),
  reason: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/doses/[id]
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const dose = await prisma.doseLog.findUnique({
      where: { id },
      include: {
        medication: true,
        patient: true,
      },
    });

    if (!dose) {
      return NextResponse.json({ error: "Dose not found" }, { status: 404 });
    }

    if (user.role === "CARETAKER") {
      assertClinicalAccess(user);
      if (dose.patient.caregiverId !== user.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } else if (user.role === "FAMILY") {
      const family = await prisma.familyMember.findUnique({ where: { id: user.id } });
      if (!family || family.patientId !== dose.patientId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json({ dose });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/doses/[id] - Correct dose within grace edit window (default 30 mins)
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const user = await requireUser();

    // 1. Role verification: only CARETAKER can correct doses
    if (user.role !== "CARETAKER") {
      return NextResponse.json(
        { error: "Forbidden: Only assigned caregivers can correct dose logs" },
        { status: 403 }
      );
    }

    assertClinicalAccess(user);
    const caregiver = await prisma.caregiver.findUnique({
      where: { id: user.id },
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    const { id: doseId } = await params;

    const json = await req.json();
    const body = patchSchema.parse(json);

    // 2. Fetch existing dose
    const dose = await prisma.doseLog.findUnique({
      where: { id: doseId },
      include: {
        medication: true,
        patient: true,
      },
    });

    if (!dose) {
      return NextResponse.json({ error: "Dose not found" }, { status: 404 });
    }

    // 3. Caregiver assignment check
    if (dose.patient.caregiverId !== caregiver.id) {
      return NextResponse.json(
        { error: "Access denied: Patient is not assigned to you" },
        { status: 403 }
      );
    }

    // 4. Must already be marked to be corrected
    if (!dose.loggedAt) {
      return NextResponse.json(
        { error: "This dose has not yet been marked. Use the mark endpoint first." },
        { status: 400 }
      );
    }

    // 5. Check 30-minute edit window (SystemSetting: doseEditMinutes)
    const settings = await getDoseSettings();
    const elapsedMinutes = (Date.now() - dose.loggedAt.getTime()) / (60 * 1000);

    if (elapsedMinutes > settings.doseEditMinutes) {
      return NextResponse.json(
        {
          error: `Forbidden: The correction window of ${settings.doseEditMinutes} minutes has expired for this dose.`,
        },
        { status: 403 }
      );
    }

    // 6. Validate reasons
    if (body.status === "REFUSED" && (!body.reason || body.reason.trim().length === 0)) {
      return NextResponse.json(
        { error: "A reason is required when correcting a dose to REFUSED" },
        { status: 400 }
      );
    }

    if (body.status === "SKIPPED" && (!body.reason || body.reason.trim().length === 0)) {
      return NextResponse.json(
        { error: "A reason is required when correcting a dose to SKIPPED" },
        { status: 400 }
      );
    }

    if (body.status === "MISSED" && (!body.reason || body.reason.trim().length === 0) && (!body.note || body.note.trim().length === 0)) {
      return NextResponse.json(
        { error: "A reason or note is required when correcting a dose to MISSED" },
        { status: 400 }
      );
    }

    // 7. Quantity adjustments
    const oldWasTaken = dose.status === "TAKEN" || dose.status === "TAKEN_LATE";
    const newIsTaken = body.status === "TAKEN" || body.status === "TAKEN_LATE";
    let newQuantity = dose.medication.remainingQuantity;

    if (oldWasTaken && !newIsTaken) {
      // Dose was incorrectly recorded as taken, restore stock
      newQuantity = dose.medication.remainingQuantity + 1;
      await prisma.medication.update({
        where: { id: dose.medicationId },
        data: { remainingQuantity: newQuantity },
      });
    } else if (!oldWasTaken && newIsTaken) {
      // Dose was changed to taken, deduct stock
      newQuantity = Math.max(0, dose.medication.remainingQuantity - 1);
      await prisma.medication.update({
        where: { id: dose.medicationId },
        data: { remainingQuantity: newQuantity },
      });
    }

    // 8. Update DoseLog with correction audit
    const now = new Date();
    const finalTakenAt = newIsTaken ? (body.takenAt ? new Date(body.takenAt) : now) : null;

    const updated = await prisma.doseLog.update({
      where: { id: dose.id },
      data: {
        status: body.status,
        takenAt: finalTakenAt,
        reason: body.reason?.trim() || null,
        note: body.note?.trim() || null,
        editedAt: now,
        editedById: caregiver.id,
      },
      include: {
        medication: true,
        patient: true,
      },
    });

    // 9. Write AuditLog preserving previous state
    await logAudit({
      actorType: "CARETAKER",
      actorId: caregiver.id,
      action: "DOSE_CORRECTED",
      targetType: "DoseLog",
      targetId: dose.id,
      summary: `${caregiver.name} corrected dose of ${dose.medication.name} from ${dose.status} to ${body.status}. Previous reason: "${dose.reason || "None"}", Previous note: "${dose.note || "None"}"`,
    });

    return NextResponse.json({
      success: true,
      dose: updated,
      remainingQuantity: newQuantity,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
