import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/notifications";

// POST /api/medications/[id]/log -> Record adherence status (TAKEN, MISSED, SKIPPED)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: medicationId } = await params;
    const { status, notes, scheduledFor } = await req.json();

    if (!status || !["TAKEN", "MISSED", "SKIPPED"].includes(status)) {
      return NextResponse.json({ error: "Valid status is required" }, { status: 400 });
    }

    // Verify medication belongs to caregiver's patient
    const medication = await prisma.medication.findFirst({
      where: { id: medicationId, patient: { caregiverId: user.id } },
      include: { patient: true },
    });

    if (!medication) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

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

    // If TAKEN, decrement remaining pill count
    if (status === "TAKEN" && medication.remainingQuantity > 0) {
      updatedRemaining = medication.remainingQuantity - 1;
      await prisma.medication.update({
        where: { id: medicationId },
        data: { remainingQuantity: updatedRemaining },
      });

      // Trigger low-refill alert if remaining drops at or below threshold
      if (updatedRemaining <= medication.refillThreshold) {
        // Check if an unread refill alert already exists
        const existingAlert = await prisma.alert.findFirst({
          where: {
            caregiverId: user.id,
            patientId: medication.patientId,
            type: "REFILL_DUE",
            isRead: false,
            message: { contains: medication.name },
          },
        });

        if (!existingAlert) {
          await prisma.alert.create({
            data: {
              caregiverId: user.id,
              patientId: medication.patientId,
              type: "REFILL_DUE",
              title: "Refill Urgently Needed",
              message: `${medication.name} (${medication.dosage}) for ${medication.patient.name} is down to ${updatedRemaining} units remaining.`,
              severity: updatedRemaining <= 3 ? "danger" : "warning",
            },
          });

          // Send email notification
          await sendNotificationEmail({
            to: user.email,
            caregiverName: user.name,
            alertType: "REFILL_DUE",
            severity: updatedRemaining <= 3 ? "danger" : "warning",
            title: "Refill Urgently Needed",
            message: `${medication.name} (${medication.dosage}) for ${medication.patient.name} is down to ${updatedRemaining} units remaining. Please schedule a refill.`,
            patientName: medication.patient.name,
            patientColor: medication.patient.avatarColor,
          });
        }
      }
    } else if (status === "MISSED") {
      // Trigger missed dose alert
      await prisma.alert.create({
        data: {
          caregiverId: user.id,
          patientId: medication.patientId,
          type: "MISSED_MED",
          title: "Missed Medication Alert",
          message: `${medication.name} dose for ${medication.patient.name} scheduled for ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} was marked as missed.`,
          severity: "warning",
        },
      });

      // Send email notification
      await sendNotificationEmail({
        to: user.email,
        caregiverName: user.name,
        alertType: "MISSED_MED",
        severity: "warning",
        title: "Missed Medication Alert",
        message: `${medication.name} dose for ${medication.patient.name} scheduled for ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} was marked as missed.`,
        patientName: medication.patient.name,
        patientColor: medication.patient.avatarColor,
      });
    }

    return NextResponse.json({ log, remainingQuantity: updatedRemaining });
  } catch (error) {
    console.error("POST /api/medications/[id]/log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
