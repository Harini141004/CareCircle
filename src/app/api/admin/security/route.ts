import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { handleApiError } from "@/lib/admin-helpers";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const securityActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("force_logout"),
    userType: z.enum(["ADMIN", "CARETAKER", "FAMILY"]),
    userId: z.string().min(1, "User ID is required"),
  }),
  z.object({
    action: z.literal("toggle_status"),
    userType: z.enum(["ADMIN", "CARETAKER", "FAMILY"]),
    userId: z.string().min(1, "User ID is required"),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal("clear_login_attempts"),
    email: z.string().optional(),
  }),
]);

// GET /api/admin/security
export async function GET(req: Request) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const filterEmail = searchParams.get("email");

    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [loginAttempts, failed24hCount, success24hCount, admins, caregivers, familyMembers] =
      await Promise.all([
        prisma.loginAttempt.findMany({
          where: filterEmail ? { email: filterEmail } : undefined,
          take: 100,
          orderBy: { createdAt: "desc" },
        }),
        prisma.loginAttempt.count({
          where: { success: false, createdAt: { gte: past24h } },
        }),
        prisma.loginAttempt.count({
          where: { success: true, createdAt: { gte: past24h } },
        }),
        prisma.admin.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            tokenVersion: true,
            lastLoginAt: true,
            createdAt: true,
          },
        }),
        prisma.caregiver.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            tokenVersion: true,
            lastLoginAt: true,
            createdAt: true,
          },
        }),
        prisma.familyMember.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            tokenVersion: true,
            lastLoginAt: true,
            createdAt: true,
          },
        }),
      ]);

    const users = [
      ...admins.map((u) => ({ ...u, role: "ADMIN" as const })),
      ...caregivers.map((u) => ({ ...u, role: "CARETAKER" as const })),
      ...familyMembers.map((u) => ({ ...u, role: "FAMILY" as const })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    const inactiveUsersCount = users.filter((u) => !u.isActive).length;

    const summary = {
      failed24hCount,
      success24hCount,
      inactiveUsersCount,
      totalUsersCount: users.length,
    };

    return NextResponse.json({
      summary,
      users,
      loginAttempts,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/security
export async function POST(req: Request) {
  try {
    const session = await requireRole("ADMIN");
    const json = await req.json();
    const data = securityActionSchema.parse(json);

    if (data.action === "force_logout") {
      let targetEmail = "";
      if (data.userType === "ADMIN") {
        const user = await prisma.admin.update({
          where: { id: data.userId },
          data: { tokenVersion: { increment: 1 } },
          select: { email: true },
        });
        targetEmail = user.email;
      } else if (data.userType === "CARETAKER") {
        const user = await prisma.caregiver.update({
          where: { id: data.userId },
          data: { tokenVersion: { increment: 1 } },
          select: { email: true },
        });
        targetEmail = user.email;
      } else if (data.userType === "FAMILY") {
        const user = await prisma.familyMember.update({
          where: { id: data.userId },
          data: { tokenVersion: { increment: 1 } },
          select: { email: true },
        });
        targetEmail = user.email;
      }

      await logAudit({
        actorType: "ADMIN",
        actorId: session.id,
        action: "FORCE_LOGOUT",
        targetType: data.userType,
        targetId: data.userId,
        summary: `Admin revoked all active sessions for ${targetEmail} (${data.userType}) by bumping tokenVersion`,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully revoked all sessions for ${targetEmail}.`,
      });
    }

    if (data.action === "toggle_status") {
      let targetEmail = "";
      // If deactivating, bump tokenVersion as well to revoke immediate session
      const tokenIncrement = !data.isActive ? { increment: 1 } : undefined;

      if (data.userType === "ADMIN") {
        const user = await prisma.admin.update({
          where: { id: data.userId },
          data: {
            isActive: data.isActive,
            ...(tokenIncrement ? { tokenVersion: tokenIncrement } : {}),
          },
          select: { email: true },
        });
        targetEmail = user.email;
      } else if (data.userType === "CARETAKER") {
        const user = await prisma.caregiver.update({
          where: { id: data.userId },
          data: {
            isActive: data.isActive,
            ...(tokenIncrement ? { tokenVersion: tokenIncrement } : {}),
          },
          select: { email: true },
        });
        targetEmail = user.email;
      } else if (data.userType === "FAMILY") {
        const user = await prisma.familyMember.update({
          where: { id: data.userId },
          data: {
            isActive: data.isActive,
            ...(tokenIncrement ? { tokenVersion: tokenIncrement } : {}),
          },
          select: { email: true },
        });
        targetEmail = user.email;
      }

      await logAudit({
        actorType: "ADMIN",
        actorId: session.id,
        action: data.isActive ? "REACTIVATE_USER" : "DEACTIVATE_USER",
        targetType: data.userType,
        targetId: data.userId,
        summary: `Admin ${data.isActive ? "reactivated/unlocked" : "deactivated/locked"} ${targetEmail} (${data.userType})`,
      });

      return NextResponse.json({
        success: true,
        message: `Account status updated for ${targetEmail}.`,
      });
    }

    if (data.action === "clear_login_attempts") {
      if (data.email) {
        await prisma.loginAttempt.deleteMany({
          where: { email: data.email },
        });
      } else {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await prisma.loginAttempt.deleteMany({
          where: { createdAt: { lt: thirtyDaysAgo } },
        });
      }

      await logAudit({
        actorType: "ADMIN",
        actorId: session.id,
        action: "CLEAR_LOGIN_ATTEMPTS",
        targetType: "LoginAttempt",
        summary: `Admin cleared login attempt logs${data.email ? ` for ${data.email}` : " older than 30 days"}`,
      });

      return NextResponse.json({
        success: true,
        message: "Login attempt records cleared successfully.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
