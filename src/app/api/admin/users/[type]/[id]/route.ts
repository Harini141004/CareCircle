import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import {
  UpdateAdminSchema,
  UpdateCaregiverSchema,
  UpdatePatientSchema,
  UpdateFamilySchema,
} from "@/lib/validations/user";
import { assertEmailUnique, handleApiError } from "@/lib/admin-helpers";
import { AccessError } from "@/lib/access";
import { logAudit } from "@/lib/audit";

// GET /api/admin/users/[type]/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    await requireRole("ADMIN");
    const { type: rawType, id } = await params;
    const type = rawType.toLowerCase();

    if (type === "admin") {
      const user = await prisma.admin.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) throw new AccessError("Admin user not found", 404);
      return NextResponse.json({ user, type: "admin" });
    }

    if (type === "caregiver") {
      const user = await prisma.caregiver.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          education: true,
          previousExperience: true,
          verificationStatus: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          patients: {
            select: {
              id: true,
              name: true,
              dob: true,
              relationship: true,
              primaryCondition: true,
              avatarColor: true,
              isActive: true,
            },
          },
          _count: {
            select: { patients: true, alerts: true },
          },
        },
      });

      if (!user) throw new AccessError("Caregiver not found", 404);
      return NextResponse.json({ user, type: "caregiver" });
    }

    if (type === "patient") {
      const user = await prisma.patient.findUnique({
        where: { id },
        include: {
          caregiver: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              verificationStatus: true,
              isActive: true,
            },
          },
          familyMembers: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              relationship: true,
              relationshipOther: true,
              isPrimaryContact: true,
              isActive: true,
              createdAt: true,
            },
            orderBy: [{ isPrimaryContact: "desc" }, { createdAt: "asc" }],
          },
          _count: {
            select: {
              medications: true,
              appointments: true,
              symptomLogs: true,
            },
          },
        },
      });

      if (!user) throw new AccessError("Patient not found", 404);
      return NextResponse.json({ user, type: "patient" });
    }

    if (type === "family") {
      const user = await prisma.familyMember.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          relationship: true,
          relationshipOther: true,
          isPrimaryContact: true,
          isActive: true,
          patientId: true,
          patient: {
            select: {
              id: true,
              name: true,
              avatarColor: true,
              relationship: true,
              primaryCondition: true,
              caregiver: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) throw new AccessError("Family member not found", 404);
      return NextResponse.json({ user, type: "family" });
    }

    return NextResponse.json(
      { error: `Invalid user type '${type}'. Must be admin, caregiver, patient, or family.` },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/admin/users/[type]/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const currentUser = await requireRole("ADMIN");
    const { type: rawType, id } = await params;
    const type = rawType.toLowerCase();

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    if (type === "admin") {
      const data = UpdateAdminSchema.parse(json);

      const existing = await prisma.admin.findUnique({ where: { id } });
      if (!existing) throw new AccessError("Admin user not found", 404);

      if (data.email && data.email.toLowerCase().trim() !== existing.email) {
        await assertEmailUnique(data.email, id);
      }

      // Rule: An admin cannot deactivate or demote themselves
      if (currentUser.id === id && data.isActive === false) {
        throw new AccessError("You cannot deactivate your own admin account.", 400);
      }

      // Rule: Last active admin cannot be removed/deactivated
      if (data.isActive === false && existing.isActive) {
        const activeCount = await prisma.admin.count({ where: { isActive: true } });
        if (activeCount <= 1) {
          throw new AccessError("Cannot deactivate the last active administrator.", 400);
        }
      }

      const updated = await prisma.admin.update({
        where: { id },
        data: {
          name: data.name ?? existing.name,
          email: data.email ? data.email.toLowerCase().trim() : existing.email,
          phone: data.phone !== undefined ? data.phone : existing.phone,
          isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const action = data.isActive !== undefined && data.isActive !== existing.isActive
        ? (data.isActive ? "REACTIVATE_USER" : "DEACTIVATE_USER")
        : "UPDATE_USER";
      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action,
        targetType: "ADMIN",
        targetId: id,
        summary: `${action === "UPDATE_USER" ? "Updated" : action === "REACTIVATE_USER" ? "Reactivated" : "Deactivated"} Admin ${updated.name} (${updated.email})`,
      });

      return NextResponse.json({ user: updated, type: "admin" });
    }

    if (type === "caregiver") {
      const data = UpdateCaregiverSchema.parse(json);

      const existing = await prisma.caregiver.findUnique({ where: { id } });
      if (!existing) throw new AccessError("Caregiver not found", 404);

      if (data.email && data.email.toLowerCase().trim() !== existing.email) {
        await assertEmailUnique(data.email, id);
      }

      const updated = await prisma.caregiver.update({
        where: { id },
        data: {
          name: data.name ?? existing.name,
          email: data.email ? data.email.toLowerCase().trim() : existing.email,
          phone: data.phone !== undefined ? data.phone : existing.phone,
          education: data.education !== undefined ? data.education : existing.education,
          previousExperience:
            data.previousExperience !== undefined ? data.previousExperience : existing.previousExperience,
          verificationStatus: data.verificationStatus ?? existing.verificationStatus,
          isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          education: true,
          previousExperience: true,
          verificationStatus: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const action = data.isActive !== undefined && data.isActive !== existing.isActive
        ? (data.isActive ? "REACTIVATE_USER" : "DEACTIVATE_USER")
        : "UPDATE_USER";
      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action,
        targetType: "CAREGIVER",
        targetId: id,
        summary: `${action === "UPDATE_USER" ? "Updated" : action === "REACTIVATE_USER" ? "Reactivated" : "Deactivated"} Caregiver ${updated.name} (${updated.email})`,
      });

      return NextResponse.json({ user: updated, type: "caregiver" });
    }

    if (type === "patient") {
      const data = UpdatePatientSchema.parse(json);

      const existing = await prisma.patient.findUnique({ where: { id } });
      if (!existing) throw new AccessError("Patient not found", 404);

      if (data.caregiverId && data.caregiverId !== existing.caregiverId) {
        const newCaregiver = await prisma.caregiver.findUnique({ where: { id: data.caregiverId } });
        if (!newCaregiver) throw new AccessError("Caregiver not found", 404);
        if (!newCaregiver.isActive) {
          throw new AccessError("Cannot assign patient to an inactive caregiver", 400);
        }
        if (newCaregiver.verificationStatus !== "VERIFIED") {
          throw new AccessError(
            "Cannot assign patient to an unverified caregiver. Caregiver status must be VERIFIED.",
            400
          );
        }
      }

      const updated = await prisma.patient.update({
        where: { id },
        data: {
          name: data.name ?? existing.name,
          dob: data.dob ? new Date(data.dob) : existing.dob,
          gender: data.gender !== undefined ? data.gender : existing.gender,
          relationship: data.relationship ?? existing.relationship,
          primaryCondition: data.primaryCondition !== undefined ? data.primaryCondition : existing.primaryCondition,
          bloodType: data.bloodType !== undefined ? data.bloodType : existing.bloodType,
          allergies: data.allergies !== undefined ? data.allergies : existing.allergies,
          emergencyContact: data.emergencyContact !== undefined ? data.emergencyContact : existing.emergencyContact,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          avatarColor: data.avatarColor ?? existing.avatarColor,
          caregiverId: data.caregiverId ?? existing.caregiverId,
          isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
        },
        include: {
          caregiver: { select: { id: true, name: true, email: true } },
        },
      });

      const action = data.caregiverId && data.caregiverId !== existing.caregiverId
        ? "REASSIGN_CAREGIVER"
        : data.isActive !== undefined && data.isActive !== existing.isActive
        ? (data.isActive ? "REACTIVATE_USER" : "DEACTIVATE_USER")
        : "UPDATE_USER";
      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action,
        targetType: "PATIENT",
        targetId: id,
        summary: `${action === "REASSIGN_CAREGIVER" ? "Reassigned caregiver for" : action === "REACTIVATE_USER" ? "Reactivated" : action === "DEACTIVATE_USER" ? "Deactivated" : "Updated"} Patient ${updated.name}`,
      });

      return NextResponse.json({ user: updated, type: "patient" });
    }

    if (type === "family") {
      const data = UpdateFamilySchema.parse(json);

      const existing = await prisma.familyMember.findUnique({ where: { id } });
      if (!existing) throw new AccessError("Family member not found", 404);

      if (data.email && data.email.toLowerCase().trim() !== existing.email) {
        await assertEmailUnique(data.email, id);
      }

      let updated;

      if (data.isPrimaryContact === true && !existing.isPrimaryContact) {
        // Enforce transaction: unset primary on others
        updated = await prisma.$transaction(async (tx) => {
          await tx.familyMember.updateMany({
            where: { patientId: existing.patientId, id: { not: id } },
            data: { isPrimaryContact: false },
          });

          return tx.familyMember.update({
            where: { id },
            data: {
              name: data.name ?? existing.name,
              email: data.email ? data.email.toLowerCase().trim() : existing.email,
              relationship: data.relationship ?? existing.relationship,
              relationshipOther:
                data.relationship === "OTHER"
                  ? data.relationshipOther
                  : data.relationship
                  ? null
                  : existing.relationshipOther,
              phone: data.phone !== undefined ? data.phone : existing.phone,
              isPrimaryContact: true,
              isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
            },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              relationship: true,
              relationshipOther: true,
              isPrimaryContact: true,
              isActive: true,
              patientId: true,
              createdAt: true,
              updatedAt: true,
            },
          });
        });
      } else {
        updated = await prisma.familyMember.update({
          where: { id },
          data: {
            name: data.name ?? existing.name,
            email: data.email ? data.email.toLowerCase().trim() : existing.email,
            relationship: data.relationship ?? existing.relationship,
            relationshipOther:
              data.relationship === "OTHER"
                ? data.relationshipOther
                : data.relationship
                ? null
                : existing.relationshipOther,
            phone: data.phone !== undefined ? data.phone : existing.phone,
            isPrimaryContact: data.isPrimaryContact !== undefined ? data.isPrimaryContact : existing.isPrimaryContact,
            isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            relationship: true,
            relationshipOther: true,
            isPrimaryContact: true,
            isActive: true,
            patientId: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      }

      const action = data.isActive !== undefined && data.isActive !== existing.isActive
        ? (data.isActive ? "REACTIVATE_USER" : "DEACTIVATE_USER")
        : "UPDATE_USER";
      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action,
        targetType: "FAMILY",
        targetId: id,
        summary: `${action === "UPDATE_USER" ? "Updated" : action === "REACTIVATE_USER" ? "Reactivated" : "Deactivated"} Family Member ${updated.name} (${updated.email})`,
      });

      return NextResponse.json({ user: updated, type: "family" });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/users/[type]/[id] -> Soft delete (isActive = false)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const currentUser = await requireRole("ADMIN");
    const { type: rawType, id } = await params;
    const type = rawType.toLowerCase();

    if (type === "admin") {
      const existing = await prisma.admin.findUnique({ where: { id } });
      if (!existing) throw new AccessError("Admin user not found", 404);

      if (currentUser.id === id) {
        throw new AccessError("You cannot deactivate your own admin account.", 400);
      }

      const activeCount = await prisma.admin.count({ where: { isActive: true } });
      if (activeCount <= 1) {
        throw new AccessError("Cannot deactivate the last active administrator.", 400);
      }

      await prisma.admin.update({
        where: { id },
        data: { isActive: false },
      });

      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action: "DEACTIVATE_USER",
        targetType: "ADMIN",
        targetId: id,
        summary: `Deactivated Admin ${existing.name} (${existing.email})`,
      });

      return NextResponse.json({ success: true, message: "Admin user deactivated successfully" });
    }

    if (type === "caregiver") {
      const existing = await prisma.caregiver.findUnique({ where: { id } });
      if (!existing) throw new AccessError("Caregiver not found", 404);

      await prisma.caregiver.update({
        where: { id },
        data: { isActive: false },
      });

      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action: "DEACTIVATE_USER",
        targetType: "CAREGIVER",
        targetId: id,
        summary: `Deactivated Caregiver ${existing.name} (${existing.email})`,
      });

      return NextResponse.json({ success: true, message: "Caregiver deactivated successfully" });
    }

    if (type === "patient") {
      const existing = await prisma.patient.findUnique({ where: { id } });
      if (!existing) throw new AccessError("Patient not found", 404);

      await prisma.patient.update({
        where: { id },
        data: { isActive: false },
      });

      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action: "DEACTIVATE_USER",
        targetType: "PATIENT",
        targetId: id,
        summary: `Deactivated Patient ${existing.name}`,
      });

      return NextResponse.json({ success: true, message: "Patient deactivated successfully" });
    }

    if (type === "family") {
      const existing = await prisma.familyMember.findUnique({ where: { id } });
      if (!existing) throw new AccessError("Family member not found", 404);

      await prisma.familyMember.update({
        where: { id },
        data: { isActive: false },
      });

      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action: "DEACTIVATE_USER",
        targetType: "FAMILY",
        targetId: id,
        summary: `Deactivated Family Member ${existing.name} (${existing.email})`,
      });

      return NextResponse.json({ success: true, message: "Family member deactivated successfully" });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
