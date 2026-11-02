import { prisma } from "./prisma";
import { SessionUser } from "./auth";
import { AccessError } from "./access";

/**
 * Returns a Prisma `where` filter condition on the Patient model
 * based on the caller's role.
 */
export function patientAccessFilter(user: SessionUser): any {
  if (user.role === "ADMIN") {
    return {};
  }

  if (user.role === "CARETAKER") {
    if (user.verificationStatus !== "VERIFIED") {
      return { id: "__unverified__" };
    }
    return { caregiverId: user.id };
  }

  if (user.role === "FAMILY") {
    // When FamilyMember model is active and linked to Patient
    return {
      familyMembers: {
        some: { id: user.id },
      },
    };
  }

  return { id: "__impossible__" };
}

/**
 * Asserts that the current user has access to the specified patient.
 * If write is true, enforces that FAMILY members cannot modify patient records.
 * Throws AccessError (403 for unverified caregiver or read-only violation, 404 if not found/unauthorized).
 */
export async function assertPatientAccess(
  user: SessionUser,
  patientId: string,
  options?: { write?: boolean }
) {
  if (user.role === "CARETAKER" && user.verificationStatus !== "VERIFIED") {
    throw new AccessError(
      user.verificationStatus === "REJECTED"
        ? `Account verification rejected: ${user.rejectionReason || "Please review your qualifications."}`
        : "Account awaiting administrative verification",
      403
    );
  }

  if (options?.write && user.role === "FAMILY") {
    throw new AccessError("Forbidden: Family members have read-only access", 403);
  }

  let patient = null;

  if (user.role === "ADMIN") {
    patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
  } else if (user.role === "CARETAKER") {
    patient = await prisma.patient.findFirst({
      where: { id: patientId, caregiverId: user.id },
    });
  } else if (user.role === "FAMILY") {
    const link = await prisma.familyMember.findFirst({
      where: { id: user.id, patientId },
    });
    if (link) {
      patient = await prisma.patient.findUnique({
        where: { id: patientId },
      });
    }
  }

  if (!patient) {
    throw new AccessError("Patient not found", 404);
  }

  return patient;
}

/**
 * Asserts that the caller has general clinical access (i.e. if Caregiver, must be VERIFIED).
 */
export function assertClinicalAccess(user: SessionUser) {
  if (user.role === "CARETAKER" && user.verificationStatus !== "VERIFIED") {
    throw new AccessError(
      user.verificationStatus === "REJECTED"
        ? `Account verification rejected: ${user.rejectionReason || "Please review your qualifications."}`
        : "Account awaiting administrative verification",
      403
    );
  }
}
