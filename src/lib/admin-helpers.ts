import { prisma } from "./prisma";
import { AccessError } from "./access";
import { ZodError } from "zod";
import { NextResponse } from "next/server";

/**
 * Checks whether an email is already used across Admin, Caregiver, or FamilyMember models.
 * Excludes `excludeId` if updating an existing record.
 * Throws an AccessError with status 409 if a conflict is found.
 */
export async function assertEmailUnique(email: string, excludeId?: string): Promise<void> {
  const normalized = email.toLowerCase().trim();

  // 1. Check Admin
  const admin = await prisma.admin.findUnique({ where: { email: normalized } });
  if (admin && admin.id !== excludeId) {
    throw new AccessError("An account with this email already exists", 409);
  }

  // 2. Check Caregiver
  const caregiver = await prisma.caregiver.findUnique({ where: { email: normalized } });
  if (caregiver && caregiver.id !== excludeId) {
    throw new AccessError("An account with this email already exists", 409);
  }

  // 3. Check FamilyMember
  const family = await prisma.familyMember.findUnique({ where: { email: normalized } });
  if (family && family.id !== excludeId) {
    throw new AccessError("An account with this email already exists", 409);
  }
}

/**
 * Formats standard error responses for admin API routes.
 */
export function handleApiError(error: unknown) {
  if (error instanceof AccessError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const message = firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Validation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.error("API Route Error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
