import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { handleApiError } from "@/lib/admin-helpers";

// GET /api/admin/patients?search=&caregiverId=
export async function GET(req: Request) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const caregiverId = searchParams.get("caregiverId") || "";

    const where: any = {};
    if (caregiverId) {
      where.caregiverId = caregiverId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { primaryCondition: { contains: search } },
        { caregiver: { name: { contains: search } } },
      ];
    }

    const [patients, verifiedCaregivers] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { name: "asc" },
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
              relationship: true,
              relationshipOther: true,
              isPrimaryContact: true,
              phone: true,
              email: true,
              isActive: true,
            },
            orderBy: [{ isPrimaryContact: "desc" }, { name: "asc" }],
          },
          _count: {
            select: {
              medications: true,
              appointments: true,
            },
          },
        },
      }),
      prisma.caregiver.findMany({
        where: { verificationStatus: "VERIFIED", isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      patients,
      verifiedCaregivers,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
