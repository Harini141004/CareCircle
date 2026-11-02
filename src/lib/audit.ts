import { prisma } from "./prisma";

export interface LogAuditParams {
  actorType: "ADMIN" | "CARETAKER" | "FAMILY" | "SYSTEM";
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  ip?: string | null;
}

export async function logAudit(params: LogAuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorType: params.actorType,
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId || null,
        summary: params.summary,
        ip: params.ip || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // Never fail the primary action if audit logging errors
    return null;
  }
}
