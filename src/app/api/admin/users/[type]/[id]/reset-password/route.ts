import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { hashPassword } from "@/lib/auth";
import { ResetPasswordSchema } from "@/lib/validations/user";
import { handleApiError } from "@/lib/admin-helpers";
import { AccessError } from "@/lib/access";
import { logAudit } from "@/lib/audit";

// POST /api/admin/users/[type]/[id]/reset-password
export async function POST(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const currentUser = await requireRole("ADMIN");
    const { type: rawType, id } = await params;
    const type = rawType.toLowerCase();

    if (type === "patient") {
      throw new AccessError("Patients do not have login credentials", 400);
    }

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { password } = ResetPasswordSchema.parse(json);
    const newPasswordHash = await hashPassword(password);

    if (type === "admin") {
      const existing = await prisma.admin.findUnique({ where: { id } });
      if (!existing) throw new AccessError("Admin user not found", 404);

      await prisma.admin.update({
        where: { id },
        data: { passwordHash: newPasswordHash, tokenVersion: { increment: 1 } },
      });

      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action: "RESET_PASSWORD",
        targetType: "ADMIN",
        targetId: id,
        summary: `Reset password for Admin ${existing.name} (${existing.email})`,
      });

      return NextResponse.json({ success: true, message: "Admin password reset successfully" });
    }

    if (type === "caregiver") {
      const existing = await prisma.caregiver.findUnique({ where: { id } });
      if (!existing) throw new AccessError("Caregiver not found", 404);

      await prisma.caregiver.update({
        where: { id },
        data: { passwordHash: newPasswordHash, tokenVersion: { increment: 1 } },
      });

      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action: "RESET_PASSWORD",
        targetType: "CAREGIVER",
        targetId: id,
        summary: `Reset password for Caregiver ${existing.name} (${existing.email})`,
      });

      return NextResponse.json({ success: true, message: "Caregiver password reset successfully" });
    }

    if (type === "family") {
      const existing = await prisma.familyMember.findUnique({ where: { id } });
      if (!existing) throw new AccessError("Family member not found", 404);

      await prisma.familyMember.update({
        where: { id },
        data: { passwordHash: newPasswordHash, tokenVersion: { increment: 1 } },
      });

      await logAudit({
        actorType: "ADMIN",
        actorId: currentUser.id,
        action: "RESET_PASSWORD",
        targetType: "FAMILY",
        targetId: id,
        summary: `Reset password for Family Member ${existing.name} (${existing.email})`,
      });

      return NextResponse.json({ success: true, message: "Family member password reset successfully" });
    }

    return NextResponse.json(
      { error: `Invalid user type '${type}'. Must be admin, caregiver, or family.` },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
