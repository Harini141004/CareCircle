import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";
import { assertClinicalAccess } from "@/lib/patient-scope";
import { handleApiError } from "@/lib/admin-helpers";
import { logAudit } from "@/lib/audit";
import { getDoseSettings, dispatchDoseNotification } from "@/lib/dose-marking";
import { z } from "zod";

const markSchema = z.object({
  status: z.enum(["TAKEN", "TAKEN_LATE", "MISSED", "REFUSED", "SKIPPED"]),
  takenAt: z.string().datetime().optional().nullable(),
  reason: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await requireUser();

    // 1. Authorization: Only CARETAKER can mark doses. Family and Admin get 403.
    if (user.role !== "CARETAKER") {
      return NextResponse.json(
        { error: "Forbidden: Only assigned caregivers can mark doses" },
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

    // 2. Parse & Validate request body
    const json = await req.json();
    const body = markSchema.parse(json);

    // 3. Fetch dose record with relations
    const dose = await prisma.doseLog.findUnique({
      where: { id: doseId },
      include: {
        medication: true,
        patient: true,
      },
    });

    if (!dose) {
      return NextResponse.json({ error: "Dose record not found" }, { status: 404 });
    }

    // 4. Verify patient belongs to caregiver
    if (dose.patient.caregiverId !== caregiver.id) {
      return NextResponse.json(
        { error: "Access denied: Patient is not assigned to you" },
        { status: 403 }
      );
    }

    // 5. Cannot mark dose for STOPPED medication
    if (dose.medication.status === "STOPPED" || !dose.medication.isActive) {
      return NextResponse.json(
        { error: "Cannot mark doses for a stopped or inactive medication" },
        { status: 400 }
      );
    }

    // 6. Cannot mark doses scheduled for a future day
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    if (dose.scheduledFor > endOfToday) {
      return NextResponse.json(
        { error: "Cannot mark doses scheduled for a future day" },
        { status: 400 }
      );
    }

    // 7. Already marked validation: return 409 Conflict if status is not PENDING
    if (dose.status !== "PENDING") {
      return NextResponse.json(
        { error: "Conflict: This dose has already been marked" },
        { status: 409 }
      );
    }

    // 8. Required reasons validation
    if (body.status === "REFUSED" && (!body.reason || body.reason.trim().length === 0)) {
      return NextResponse.json(
        { error: "A specific reason is required when a dose is refused" },
        { status: 400 }
      );
    }

    if (body.status === "SKIPPED" && (!body.reason || body.reason.trim().length === 0)) {
      return NextResponse.json(
        { error: "A reason is required when skipping a scheduled dose" },
        { status: 400 }
      );
    }

    if (body.status === "MISSED" && (!body.reason || body.reason.trim().length === 0) && (!body.note || body.note.trim().length === 0)) {
      return NextResponse.json(
        { error: "A reason or clinical note is required when marking a dose missed" },
        { status: 400 }
      );
    }

    // 9. Calculate final status & takenAt for TAKEN
    const settings = await getDoseSettings();
    let finalStatus = body.status;
    let finalTakenAt: Date | null = null;

    if (body.status === "TAKEN" || body.status === "TAKEN_LATE") {
      finalTakenAt = body.takenAt ? new Date(body.takenAt) : now;
      const lateThreshold = new Date(dose.scheduledFor.getTime() + settings.overdueDoseMinutes * 60 * 1000);

      if (finalTakenAt > lateThreshold) {
        finalStatus = "TAKEN_LATE";
      } else {
        finalStatus = body.status;
      }
    }

    // 10. Decrement medication quantity on TAKEN and TAKEN_LATE only (never on MISSED, REFUSED, SKIPPED)
    let newQuantity = dose.medication.remainingQuantity;
    if (finalStatus === "TAKEN" || finalStatus === "TAKEN_LATE") {
      newQuantity = Math.max(0, dose.medication.remainingQuantity - 1);

      await prisma.medication.update({
        where: { id: dose.medicationId },
        data: { remainingQuantity: newQuantity },
      });

      // Low stock alert trigger
      if (newQuantity <= dose.medication.refillThreshold) {
        // Check if an alert already exists within the last 24h
        const recentAlert = await prisma.alert.findFirst({
          where: {
            caregiverId: caregiver.id,
            patientId: dose.patientId,
            type: "REFILL_DUE",
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!recentAlert) {
          await prisma.alert.create({
            data: {
              caregiverId: caregiver.id,
              patientId: dose.patientId,
              type: "REFILL_DUE",
              title: `Low Stock: ${dose.medication.name}`,
              message: `${dose.medication.name} has ${newQuantity} doses remaining (threshold: ${dose.medication.refillThreshold}). Refill needed for ${dose.patient.name}.`,
              severity: "warning",
            },
          });
        }
      }
    }

    // 11. Update DoseLog
    const updatedDose = await prisma.doseLog.update({
      where: { id: dose.id },
      data: {
        status: finalStatus,
        takenAt: finalTakenAt,
        reason: body.reason?.trim() || null,
        note: body.note?.trim() || null,
        loggedByType: "CARETAKER",
        loggedById: caregiver.id,
        loggedAt: now,
      },
      include: {
        medication: true,
        patient: true,
      },
    });

    // 12. Dispatch notification on MISSED or REFUSED
    if (finalStatus === "MISSED" || finalStatus === "REFUSED") {
      await dispatchDoseNotification({
        patientId: dose.patientId,
        caregiverId: caregiver.id,
        caregiverName: caregiver.name,
        caregiverEmail: caregiver.email,
        patientName: dose.patient.name,
        patientAvatarColor: dose.patient.avatarColor,
        medicationName: dose.medication.name,
        scheduledFor: dose.scheduledFor,
        status: finalStatus,
        reason: body.reason?.trim() || body.note?.trim() || null,
        loggedByName: caregiver.name,
        severity: "warning",
      });
    }

    // 13. AuditLog entry
    await logAudit({
      actorType: "CARETAKER",
      actorId: caregiver.id,
      action: "DOSE_MARKED",
      targetType: "DoseLog",
      targetId: dose.id,
      summary: `${caregiver.name} marked ${dose.medication.name} (${dose.medication.dosage}) as ${finalStatus} for ${dose.patient.name}${body.reason ? `. Reason: ${body.reason}` : ""}`,
    });

    return NextResponse.json({
      success: true,
      dose: updatedDose,
      remainingQuantity: newQuantity,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
