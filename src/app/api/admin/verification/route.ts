import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { handleApiError } from "@/lib/admin-helpers";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const VerificationActionSchema = z.object({
  caregiverId: z.string().min(1, "Caregiver ID is required"),
  status: z.enum(["VERIFIED", "REJECTED"]),
  reason: z.string().optional(),
}).refine(
  (data) => {
    if (data.status === "REJECTED") {
      return !!data.reason && data.reason.trim().length > 0;
    }
    return true;
  },
  {
    message: "A rejection reason is required when rejecting a caregiver.",
    path: ["reason"],
  }
);

// GET /api/admin/verification?status=PENDING|VERIFIED|REJECTED|ALL
export async function GET(req: Request) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.toUpperCase() || "PENDING";

    const whereClause: any = {};
    if (status !== "ALL") {
      whereClause.verificationStatus = status;
    }

    const caregivers = await prisma.caregiver.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        education: true,
        previousExperience: true,
        verificationStatus: true,
        rejectionReason: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { patients: true },
        },
      },
    });

    return NextResponse.json({ caregivers });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/verification
export async function POST(req: Request) {
  try {
    const currentUser = await requireRole("ADMIN");

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const validated = VerificationActionSchema.parse(json);

    const caregiver = await prisma.caregiver.findUnique({
      where: { id: validated.caregiverId },
      include: { _count: { select: { patients: true } } },
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    const updated = await prisma.caregiver.update({
      where: { id: validated.caregiverId },
      data: {
        verificationStatus: validated.status,
        rejectionReason: validated.status === "REJECTED" ? validated.reason!.trim() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        verificationStatus: true,
        rejectionReason: true,
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: currentUser.id,
      action: validated.status === "VERIFIED" ? "VERIFY_CAREGIVER" : "REJECT_CAREGIVER",
      targetType: "CAREGIVER",
      targetId: caregiver.id,
      summary:
        validated.status === "VERIFIED"
          ? `Verified Caregiver credentials for ${caregiver.name} (${caregiver.email})`
          : `Rejected Caregiver credentials for ${caregiver.name}. Reason: ${validated.reason}`,
    });

    return NextResponse.json({
      success: true,
      message:
        validated.status === "VERIFIED"
          ? `Caregiver ${caregiver.name} verified successfully`
          : `Caregiver ${caregiver.name} rejected`,
      caregiver: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
