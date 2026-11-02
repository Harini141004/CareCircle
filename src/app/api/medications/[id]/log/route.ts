import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { assertPatientAccess } from "@/lib/patient-scope";
import { dispatchCaregiverAlert } from "@/lib/notifications";

// POST /api/medications/[id]/log -> Record adherence status (TAKEN, MISSED, SKIPPED)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: medicationId } = await params;
    const { status, notes, scheduledFor } = await req.json();

    if (!status || !["TAKEN", "MISSED", "SKIPPED"].includes(status)) {
      return NextResponse.json({ error: "Valid status is required" }, { status: 400 });
    }

    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
      include: {
        patient: {
          include: {
            caregiver: true,
          },
        },
      },
    });

    if (!medication) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

    // Verify user has write access to patient
    await assertPatientAccess(user, medication.patientId, { write: true });

    const scheduledDate = scheduledFor ? new Date(scheduledFor) : new Date();

    // Create MedicationLog
    const log = await prisma.medicationLog.create({
      data: {
        medicationId,
        patientId: medication.patientId,
        scheduledFor: scheduledDate,
        status,
        takenAt: status === "TAKEN" ? new Date() : null,
        notes,
      },
    });

    let updatedRemaining = medication.remainingQuantity;

    // Retrieve default refill warning threshold from SystemSetting if needed
    let effectiveThreshold = medication.refillThreshold;
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key: "refillWarningDays" } });
      if (setting && setting.value) {
        const parsedSetting = JSON.parse(setting.value);
        if (typeof parsedSetting === "number" && effectiveThreshold === 7) {
          effectiveThreshold = parsedSetting;
        }
      }
    } catch {
      // keep effectiveThreshold
    }

    const assignedCaregiver = medication.patient.caregiver;

    // If TAKEN, decrement remaining pill count
    if (status === "TAKEN" && medication.remainingQuantity > 0) {
      updatedRemaining = medication.remainingQuantity - 1;
      await prisma.medication.update({
        where: { id: medicationId },
        data: { remainingQuantity: updatedRemaining },
      });

      // Trigger low-refill alert if remaining drops at or below threshold
      if (updatedRemaining <= effectiveThreshold && assignedCaregiver) {
        // Check if an unread refill alert already exists
        const existingAlert = await prisma.alert.findFirst({
          where: {
            caregiverId: medication.patient.caregiverId,
            patientId: medication.patientId,
            type: "REFILL_DUE",
            isRead: false,
            message: { contains: medication.name },
          },
        });

        if (!existingAlert) {
          await dispatchCaregiverAlert({
            caregiverId: medication.patient.caregiverId,
            caregiverName: assignedCaregiver.name,
            caregiverEmail: assignedCaregiver.email,
            patientId: medication.patientId,
            type: "REFILL_DUE",
            severity: updatedRemaining <= 3 ? "danger" : "warning",
            title: "Refill Urgently Needed",
            message: `${medication.name} (${medication.dosage}) for ${medication.patient.name} is down to ${updatedRemaining} units remaining. Please schedule a refill.`,
            patientName: medication.patient.name,
            patientColor: medication.patient.avatarColor,
          });
        }
      }
    } else if (status === "MISSED" && assignedCaregiver) {
      // Trigger missed dose alert sent to the assigned caregiver
      await dispatchCaregiverAlert({
        caregiverId: medication.patient.caregiverId,
        caregiverName: assignedCaregiver.name,
        caregiverEmail: assignedCaregiver.email,
        patientId: medication.patientId,
        type: "MISSED_MED",
        severity: "warning",
        title: "Missed Medication Alert",
        message: `${medication.name} dose for ${medication.patient.name} scheduled for ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} was marked as missed.`,
        patientName: medication.patient.name,
        patientColor: medication.patient.avatarColor,
      });
    }

    return NextResponse.json({ log, remainingQuantity: updatedRemaining });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/medications/[id]/log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
