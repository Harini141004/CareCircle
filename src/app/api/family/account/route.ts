import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, AccessError } from "@/lib/access";
import { verifyPassword, hashPassword, clearSessionCookie } from "@/lib/auth";

const updateFamilyAccountSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
});

// GET /api/family/account -> Retrieve current family member profile and linked patient
export async function GET() {
  try {
    const user = await requireRole("FAMILY");

    const familyMember = await prisma.familyMember.findUnique({
      where: { id: user.id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            dob: true,
            bloodType: true,
            primaryCondition: true,
            allergies: true,
            emergencyContact: true,
            avatarColor: true,
            caregiver: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!familyMember) {
      return NextResponse.json({ error: "Family member record not found" }, { status: 404 });
    }

    return NextResponse.json({
      familyMember: {
        id: familyMember.id,
        name: familyMember.name,
        email: familyMember.email,
        phone: familyMember.phone,
        relationship: familyMember.relationship,
        relationshipOther: familyMember.relationshipOther,
        isPrimaryContact: familyMember.isPrimaryContact,
        lastLoginAt: familyMember.lastLoginAt,
        createdAt: familyMember.createdAt,
        patient: familyMember.patient,
      },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/family/account error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/family/account -> Update personal details or change password
export async function PUT(req: Request) {
  try {
    const user = await requireRole("FAMILY");
    const body = await req.json();

    const parsed = updateFamilyAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, phone, currentPassword, newPassword } = parsed.data;

    const existing = await prisma.familyMember.findUnique({
      where: { id: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Family member record not found" }, { status: 404 });
    }

    const updateData: any = {};
    let passwordChanged = false;

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone || null;

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required to set a new password" }, { status: 400 });
      }

      const validCurrent = await verifyPassword(currentPassword, existing.passwordHash);
      if (!validCurrent) {
        return NextResponse.json({ error: "Current password does not match" }, { status: 400 });
      }

      updateData.passwordHash = await hashPassword(newPassword);
      updateData.tokenVersion = { increment: 1 };
      passwordChanged = true;
    }

    const updated = await prisma.familyMember.update({
      where: { id: user.id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        actorType: "FAMILY",
        actorId: user.id,
        action: passwordChanged ? "PASSWORD_CHANGE" : "PROFILE_UPDATE",
        targetType: "FamilyMember",
        targetId: user.id,
        summary: passwordChanged
          ? `Family member ${updated.name} changed their password (sessions revoked)`
          : `Family member ${updated.name} updated profile details`,
      },
    });

    const response = NextResponse.json({
      success: true,
      passwordChanged,
      familyMember: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
      },
    });

    if (passwordChanged) {
      await clearSessionCookie();
    }

    return response;
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PUT /api/family/account error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
