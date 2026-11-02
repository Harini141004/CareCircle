import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { handleApiError } from "@/lib/admin-helpers";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().nullable(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

// GET /api/admin/profile
export async function GET() {
  try {
    const currentUser = await requireRole("ADMIN");

    const [admin, recentOwnActions] = await Promise.all([
      prisma.admin.findUnique({
        where: { id: currentUser.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { actorId: currentUser.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    if (!admin) {
      return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      admin,
      recentActions: recentOwnActions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/admin/profile
export async function PUT(req: Request) {
  try {
    const currentUser = await requireRole("ADMIN");

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { name, phone } = UpdateProfileSchema.parse(json);

    const updated = await prisma.admin.update({
      where: { id: currentUser.id },
      data: {
        name,
        phone: phone ? phone.trim() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: currentUser.id,
      action: "UPDATE_PROFILE",
      targetType: "ADMIN",
      targetId: currentUser.id,
      summary: `Admin updated own profile details (Name: ${name})`,
    });

    return NextResponse.json({
      success: true,
      admin: updated,
      message: "Profile updated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/profile -> Change Password & Force Relogin
export async function POST(req: Request) {
  try {
    const currentUser = await requireRole("ADMIN");

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { currentPassword, newPassword } = ChangePasswordSchema.parse(json);

    const admin = await prisma.admin.findUnique({
      where: { id: currentUser.id },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const isMatch = await verifyPassword(currentPassword, admin.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect current password" },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);

    // Bump tokenVersion to immediately revoke current session on server-side
    await prisma.admin.update({
      where: { id: currentUser.id },
      data: {
        passwordHash: newHash,
        tokenVersion: { increment: 1 },
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: currentUser.id,
      action: "CHANGE_PASSWORD",
      targetType: "ADMIN",
      targetId: currentUser.id,
      summary: "Admin changed own password (forced re-login)",
    });

    return NextResponse.json({
      success: true,
      forceRelogin: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
