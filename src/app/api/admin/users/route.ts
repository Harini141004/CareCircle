import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, AccessError } from "@/lib/access";
import { hashPassword } from "@/lib/auth";
import { CreateUserSchema } from "@/lib/validations/user";
import { assertEmailUnique, handleApiError } from "@/lib/admin-helpers";
import { logAudit } from "@/lib/audit";

// GET /api/admin/users?type=admin|caregiver|patient|family&search=&status=&page=&limit=
export async function GET(req: Request) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "caregiver").toLowerCase();
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.toLowerCase() || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10") || 10));
    const skip = (page - 1) * limit;

    let users: any[] = [];
    let total = 0;

    const activeFilter =
      status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {};

    if (type === "admin") {
      const where: any = {
        ...activeFilter,
      };

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ];
      }

      const [items, count] = await Promise.all([
        prisma.admin.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.admin.count({ where }),
      ]);

      users = items;
      total = count;
    } else if (type === "caregiver") {
      const where: any = {
        ...activeFilter,
      };

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { education: { contains: search } },
        ];
      }

      const [items, count] = await Promise.all([
        prisma.caregiver.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
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
            _count: {
              select: { patients: true },
            },
          },
        }),
        prisma.caregiver.count({ where }),
      ]);

      users = items;
      total = count;
    } else if (type === "patient") {
      const where: any = {
        ...activeFilter,
      };

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { primaryCondition: { contains: search } },
          { emergencyContact: { contains: search } },
          { relationship: { contains: search } },
        ];
      }

      const [items, count] = await Promise.all([
        prisma.patient.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
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
                relationship: true,
                relationshipOther: true,
                phone: true,
                isPrimaryContact: true,
                isActive: true,
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
        }),
        prisma.patient.count({ where }),
      ]);

      users = items;
      total = count;
    } else if (type === "family") {
      const where: any = {
        ...activeFilter,
      };

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { relationship: { contains: search } },
          { patient: { name: { contains: search } } },
        ];
      }

      const [items, count] = await Promise.all([
        prisma.familyMember.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
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
                caregiver: {
                  select: { id: true, name: true },
                },
              },
            },
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.familyMember.count({ where }),
      ]);

      users = items;
      total = count;
    } else {
      return NextResponse.json(
        { error: `Invalid user type '${type}'. Must be admin, caregiver, patient, or family.` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/users
export async function POST(req: Request) {
  try {
    const currentUser = await requireRole("ADMIN");

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const validated = CreateUserSchema.parse(json);

    if (validated.type === "admin") {
      await assertEmailUnique(validated.email);
      const passwordHash = await hashPassword(validated.password);

      const admin = await prisma.admin.create({
        data: {
          name: validated.name,
          email: validated.email.toLowerCase().trim(),
          passwordHash,
          phone: validated.phone || null,
          isActive: true,
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

      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action: "CREATE_USER",
        targetType: "ADMIN",
        targetId: admin.id,
        summary: `Created Admin account ${admin.name} (${admin.email})`,
      });

      return NextResponse.json({ user: admin, type: "admin" }, { status: 201 });
    }

    if (validated.type === "caregiver") {
      await assertEmailUnique(validated.email);
      const passwordHash = await hashPassword(validated.password);

      const caregiver = await prisma.caregiver.create({
        data: {
          name: validated.name,
          email: validated.email.toLowerCase().trim(),
          passwordHash,
          phone: validated.phone || null,
          education: validated.education || null,
          previousExperience: validated.previousExperience || null,
          verificationStatus: validated.verificationStatus || "VERIFIED",
          isActive: true,
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

      await prisma.notificationPreference.create({
        data: {
          userType: "CARETAKER",
          userId: caregiver.id,
          emailAlerts: true,
          inAppAlerts: true,
          notifyMissedMed: true,
          notifyRefillDue: true,
          notifyVitalsWarning: true,
          notifyAppointment: true,
        },
      }).catch(() => {});

      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action: "CREATE_USER",
        targetType: "CAREGIVER",
        targetId: caregiver.id,
        summary: `Created Caregiver account ${caregiver.name} (${caregiver.email})`,
      });

      return NextResponse.json({ user: caregiver, type: "caregiver" }, { status: 201 });
    }

    if (validated.type === "patient") {
      const caregiver = await prisma.caregiver.findUnique({
        where: { id: validated.caregiverId },
      });

      if (!caregiver) {
        throw new AccessError("Caregiver not found", 404);
      }

      if (!caregiver.isActive) {
        throw new AccessError("Cannot assign patient to an inactive caregiver", 400);
      }

      if (caregiver.verificationStatus !== "VERIFIED") {
        throw new AccessError(
          "Cannot assign patient to an unverified caregiver. Caregiver status must be VERIFIED.",
          400
        );
      }

      const patient = await prisma.patient.create({
        data: {
          caregiverId: validated.caregiverId,
          name: validated.name,
          dob: new Date(validated.dob),
          gender: validated.gender || null,
          relationship: validated.relationship,
          primaryCondition: validated.primaryCondition || null,
          bloodType: validated.bloodType || null,
          allergies: validated.allergies || null,
          emergencyContact: validated.emergencyContact || null,
          notes: validated.notes || null,
          avatarColor: validated.avatarColor || "#0D9488",
          isActive: true,
        },
        include: {
          caregiver: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action: "CREATE_USER",
        targetType: "PATIENT",
        targetId: patient.id,
        summary: `Created Patient ${patient.name} assigned to Caregiver ${patient.caregiver.name}`,
      });

      return NextResponse.json({ user: patient, type: "patient" }, { status: 201 });
    }

    if (validated.type === "family") {
      await assertEmailUnique(validated.email);

      const patient = await prisma.patient.findUnique({
        where: { id: validated.patientId },
      });

      if (!patient) {
        throw new AccessError("Patient not found", 404);
      }

      const passwordHash = await hashPassword(validated.password);

      let familyMember;

      if (validated.isPrimaryContact) {
        // Enforce: setting primary unsets flag on other family members in one transaction
        familyMember = await prisma.$transaction(async (tx) => {
          await tx.familyMember.updateMany({
            where: { patientId: validated.patientId },
            data: { isPrimaryContact: false },
          });

          return tx.familyMember.create({
            data: {
              name: validated.name,
              email: validated.email.toLowerCase().trim(),
              passwordHash,
              patientId: validated.patientId,
              relationship: validated.relationship,
              relationshipOther: validated.relationship === "OTHER" ? validated.relationshipOther : null,
              phone: validated.phone || null,
              isPrimaryContact: true,
              isActive: true,
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
        familyMember = await prisma.familyMember.create({
          data: {
            name: validated.name,
            email: validated.email.toLowerCase().trim(),
            passwordHash,
            patientId: validated.patientId,
            relationship: validated.relationship,
            relationshipOther: validated.relationship === "OTHER" ? validated.relationshipOther : null,
            phone: validated.phone || null,
            isPrimaryContact: false,
            isActive: true,
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

      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action: "CREATE_USER",
        targetType: "FAMILY",
        targetId: familyMember.id,
        summary: `Created Family Member ${familyMember.name} (${familyMember.relationship}) for patient ${patient.name}`,
      });

      return NextResponse.json({ user: familyMember, type: "family" }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
