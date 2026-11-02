import { NextResponse } from "next/server";
import { requireRole } from "@/lib/access";
import { handleApiError } from "@/lib/admin-helpers";
import { logAudit } from "@/lib/audit";
import fs from "fs";
import path from "path";

function getSqliteDbPath(): string | null {
  const possiblePaths = [
    path.resolve(process.cwd(), "dev.db"),
    path.resolve(process.cwd(), "prisma/dev.db"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
      return p;
    }
  }
  return null;
}

// GET /api/admin/data/backup
export async function GET() {
  try {
    const session = await requireRole("ADMIN");

    const dbPath = getSqliteDbPath();
    if (!dbPath || !fs.existsSync(/*turbopackIgnore: true*/ dbPath)) {
      return NextResponse.json(
        { error: "SQLite database file not found on disk" },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(/*turbopackIgnore: true*/ dbPath);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `carecircle-backup-${dateStr}.db`;

    await logAudit({
      actorType: "ADMIN",
      actorId: session.id,
      action: "DATABASE_BACKUP_DOWNLOAD",
      targetType: "SQLite Database",
      targetId: path.basename(dbPath),
      summary: `Admin downloaded complete SQLite database backup (${(fileBuffer.length / 1024).toFixed(1)} KB)`,
    });

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
