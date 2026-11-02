import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { handleApiError } from "@/lib/admin-helpers";

// GET /api/admin/audit?actorType=&action=&search=&page=&limit=&format=json|csv
export async function GET(req: Request) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const actorType = searchParams.get("actorType") || "";
    const action = searchParams.get("action") || "";
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const format = searchParams.get("format") || "json";

    const where: any = {};
    if (actorType && actorType !== "ALL") {
      where.actorType = actorType;
    }
    if (action && action !== "ALL") {
      where.action = action;
    }
    if (search) {
      where.OR = [
        { summary: { contains: search } },
        { action: { contains: search } },
        { targetType: { contains: search } },
        { actorId: { contains: search } },
      ];
    }

    if (format === "csv") {
      const allLogs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 2000,
      });

      const header = ["Timestamp", "Actor Type", "Actor ID", "Action", "Target Type", "Target ID", "Summary", "IP Address"].join(",");
      const rows = allLogs.map((l) =>
        [
          `"${new Date(l.createdAt).toISOString()}"`,
          l.actorType,
          `"${l.actorId}"`,
          l.action,
          l.targetType,
          `"${l.targetId || ""}"`,
          `"${l.summary.replace(/"/g, '""')}"`,
          `"${l.ip || ""}"`,
        ].join(",")
      );

      return new NextResponse([header, ...rows].join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="carecircle-audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
