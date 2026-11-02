import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { assertPatientAccess } from "@/lib/patient-scope";
import { dispatchCaregiverAlert } from "@/lib/notifications";

const refillRequestSchema = z.object({
  medicationId: z.string().min(1, "Medication ID is required"),
  note: z.string().optional(),
});

// POST /api/family/refill -> Request a medication refill on behalf of patient
export async function POST(req: Request) {
  try {
    const user = await requireUser();

    if (user.role !== "FAMILY" && user.role !== "ADMIN") {
      throw new AccessError("Forbidden: Only family members or admins may request refills via this endpoint", 403);
    }

    const body = await req.json();
    const parsed = refillRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const medication = await prisma.medication.findUnique({
      where: { id: parsed.data.medicationId },
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

    // Check that family member is linked to this medication's patient
    await assertPatientAccess(user, medication.patientId);

    if (!medication.patient.caregiverId || !medication.patient.caregiver) {
      return NextResponse.json(
        { error: "No primary caregiver is assigned to this patient to receive the refill request" },
        { status: 400 }
      );
    }

    const caregiver = medication.patient.caregiver;
    const alertMessage = `${user.name} (family member) requested a refill for ${medication.name} (${medication.dosage || ""}). Remaining count: ${medication.remainingQuantity ?? "unknown"}.${
      parsed.data.note ? ` Note: "${parsed.data.note}"` : ""
    }`;

    // Dispatch in-app alert and email notification to assigned caregiver
    const alert = await dispatchCaregiverAlert({
      caregiverId: caregiver.id,
      caregiverName: caregiver.name,
      caregiverEmail: caregiver.email,
      patientId: medication.patientId,
      type: "REFILL_DUE",
      title: `Medication Refill Request: ${medication.name}`,
      message: alertMessage,
      severity: "warning",
      patientName: medication.patient.name,
      patientColor: medication.patient.avatarColor,
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        actorType: user.role,
        actorId: user.id,
        action: "REFILL_REQUESTED",
        targetType: "Medication",
        targetId: medication.id,
        summary: `Family member ${user.name} requested a refill for ${medication.name} (${medication.patient.name})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Refill request submitted to caregiver ${caregiver.name}.`,
      alertId: alert?.id,
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/family/refill error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
