import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, AccessError } from "@/lib/access";
import { verifyPassword, hashPassword, clearSessionCookie } from "@/lib/auth";
import { getDoseSettings, computeAdherence } from "@/lib/dose-marking";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  previousExperience: z.string().optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
});

export async function GET() {
  try {
    const user = await requireRole("CARETAKER");

    const caregiver = await prisma.caregiver.findUnique({
      where: { id: user.id },
      include: {
        patients: {
          select: {
            id: true,
            name: true,
            dob: true,
            relationship: true,
            avatarColor: true,
            primaryCondition: true,
          },
        },
      },
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    // Calculate dynamic adherence score across all assigned patients
    const patientIds = caregiver.patients.map((p) => p.id);
    let adherenceScore = 100;
    let totalLogs = 0;
    let takenLogs = 0;
    let refusedLogs = 0;

    if (patientIds.length > 0) {
      const settings = await getDoseSettings();
      const logs = await prisma.doseLog.findMany({
        where: { patientId: { in: patientIds } },
        select: { status: true },
      });
      const metrics = computeAdherence(logs, settings.countRefusedInAdherence);
      totalLogs = metrics.totalExpected;
      takenLogs = metrics.takenCount + metrics.takenLateCount;
      refusedLogs = metrics.refusedCount;
      adherenceScore = metrics.adherenceRate;
    }

    const tier =
      adherenceScore >= 95
        ? "Gold Caregiver"
        : adherenceScore >= 85
        ? "Silver Caregiver"
        : adherenceScore >= 70
        ? "Bronze Caregiver"
        : "Standard Caregiver";

    return NextResponse.json({
      caregiver: {
        id: caregiver.id,
        name: caregiver.name,
        email: caregiver.email,
        phone: caregiver.phone,
        verificationStatus: caregiver.verificationStatus,
        rejectionReason: caregiver.rejectionReason,
        education: caregiver.education,
        previousExperience: caregiver.previousExperience,
        lastLoginAt: caregiver.lastLoginAt,
        createdAt: caregiver.createdAt,
        patients: caregiver.patients,
      },
      adherence: {
        score: adherenceScore,
        totalLogs,
        takenLogs,
        tier,
      },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireRole("CARETAKER");
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const {
      name,
      phone,
      education,
      previousExperience,
      currentPassword,
      newPassword,
    } = parsed.data;

    const existing = await prisma.caregiver.findUnique({
      where: { id: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (education !== undefined) updateData.education = education;
    if (previousExperience !== undefined) updateData.previousExperience = previousExperience;

    let passwordChanged = false;

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password" },
          { status: 400 }
        );
      }

      const valid = await verifyPassword(currentPassword, existing.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
      }

      updateData.passwordHash = await hashPassword(newPassword);
      updateData.tokenVersion = { increment: 1 };
      passwordChanged = true;
    }

    const updated = await prisma.caregiver.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        verificationStatus: true,
        education: true,
        previousExperience: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorType: "CARETAKER",
        actorId: user.id,
        action: passwordChanged ? "PROFILE_AND_PASSWORD_UPDATED" : "PROFILE_UPDATED",
        targetType: "Caregiver",
        targetId: user.id,
        summary: passwordChanged
          ? `Caregiver ${user.name} updated profile and changed password (sessions revoked)`
          : `Caregiver ${user.name} updated profile details`,
      },
    });

    const response = NextResponse.json({
      success: true,
      caregiver: updated,
      passwordChanged,
    });

    if (passwordChanged) {
      await clearSessionCookie();
    }

    return response;
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PUT /api/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
