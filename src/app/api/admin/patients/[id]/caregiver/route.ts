import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { ReassignCaregiverSchema } from "@/lib/validations/user";
import { handleApiError } from "@/lib/admin-helpers";
import { AccessError } from "@/lib/access";
import { logAudit } from "@/lib/audit";

// PATCH /api/admin/patients/[id]/caregiver
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRole("ADMIN");
    const { id: patientId } = await params;

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { caregiverId } = ReassignCaregiverSchema.parse(json);

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        caregiver: { select: { id: true, name: true, email: true } },
      },
    });

    if (!patient) {
      throw new AccessError("Patient not found", 404);
    }

    // Verify new caregiver exists, is active, and is verified
    const newCaregiver = await prisma.caregiver.findUnique({
      where: { id: caregiverId },
    });

    if (!newCaregiver) {
      throw new AccessError("Target caregiver not found", 404);
    }

    if (!newCaregiver.isActive) {
      throw new AccessError("Cannot assign patient to an inactive caregiver", 400);
    }

    // Rule: A caregiver with verificationStatus != VERIFIED cannot be assigned new patients
    if (newCaregiver.verificationStatus !== "VERIFIED") {
      throw new AccessError(
        "Cannot assign patient to an unverified caregiver. Caregiver status must be VERIFIED.",
        400
      );
    }

    // Perform reassignment and update unread patient alerts in one transaction
    const updatedPatient = await prisma.$transaction(async (tx) => {
      // Re-route existing open alerts to the new caregiver
      await tx.alert.updateMany({
        where: { patientId, isRead: false },
        data: { caregiverId },
      });

      return tx.patient.update({
        where: { id: patientId },
        data: { caregiverId },
        include: {
          caregiver: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              verificationStatus: true,
            },
          },
        },
      });
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: currentUser.id,
      action: "REASSIGN_CAREGIVER",
      targetType: "PATIENT",
      targetId: patientId,
      summary: `Reassigned Patient ${updatedPatient.name} from ${patient.caregiver.name} to ${newCaregiver.name}`,
    });

    return NextResponse.json({
      success: true,
      message: `Patient ${updatedPatient.name} successfully reassigned to ${newCaregiver.name}`,
      patient: updatedPatient,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
