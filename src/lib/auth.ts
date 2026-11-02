import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "carecircle_session";

export type Role = "ADMIN" | "CARETAKER" | "FAMILY";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  patientId?: string;
  tokenVersion?: number;
  verificationStatus?: string;
  rejectionReason?: string | null;
}

export function getSessionSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or shorter than 32 characters. A secure 32+ character SESSION_SECRET is required."
    );
  }
  return new TextEncoder().encode(secret);
}

export function homePathForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "FAMILY":
      return "/family/profile";
    case "CARETAKER":
    default:
      return "/dashboard";
  }
}

export async function createSessionToken(
  userId: string,
  role: Role = "CARETAKER",
  tokenVersion: number = 0
): Promise<string> {
  const secretKey = getSessionSecretKey();
  return await new SignJWT({ role, tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySessionToken(
  token: string
): Promise<{ sub: string; role: Role; tokenVersion?: number } | null> {
  try {
    const secretKey = getSessionSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }

    const role = (payload.role as Role) || "CARETAKER";
    const tokenVersion = typeof payload.tokenVersion === "number" ? payload.tokenVersion : 0;
    return { sub: payload.sub, role, tokenVersion };
  } catch {
    // Catches signature verification errors, expired tokens, malformed strings, and legacy base64 cookies
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionToken) return null;

    const session = await verifySessionToken(sessionToken);
    if (!session) return null;

    const { sub: userId, role, tokenVersion } = session;

    // Re-load the user from the DB and reject if inactive or deleted
    if (role === "CARETAKER") {
      const caregiver = await prisma.caregiver.findUnique({
        where: { id: userId },
      });
      if (!caregiver || !caregiver.isActive) return null;
      if (tokenVersion !== undefined && (caregiver as any).tokenVersion !== undefined) {
        if ((caregiver as any).tokenVersion !== tokenVersion) return null;
      }
      return {
        id: caregiver.id,
        email: caregiver.email,
        name: caregiver.name,
        role: "CARETAKER",
        verificationStatus: caregiver.verificationStatus,
        rejectionReason: caregiver.rejectionReason,
        tokenVersion: (caregiver as any).tokenVersion ?? 0,
      };
    } else if (role === "ADMIN") {
      const admin = await prisma.admin.findUnique({
        where: { id: userId },
      });
      if (!admin || !admin.isActive) return null;
      if (tokenVersion !== undefined && (admin as any).tokenVersion !== undefined) {
        if ((admin as any).tokenVersion !== tokenVersion) return null;
      }
      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: "ADMIN",
        tokenVersion: (admin as any).tokenVersion ?? 0,
      };
    } else if (role === "FAMILY") {
      const member = await prisma.familyMember.findUnique({
        where: { id: userId },
      });
      if (!member || !member.isActive) return null;
      if (tokenVersion !== undefined && (member as any).tokenVersion !== undefined) {
        if ((member as any).tokenVersion !== tokenVersion) return null;
      }
      return {
        id: member.id,
        email: member.email,
        name: member.name,
        role: "FAMILY",
        patientId: member.patientId,
        tokenVersion: (member as any).tokenVersion ?? 0,
      };
    }

    return null;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("SESSION_SECRET is missing or shorter than 32 characters")
    ) {
      throw error;
    }
    if (error && typeof error === "object" && (error as any).digest === "DYNAMIC_SERVER_USAGE") {
      throw error;
    }
    console.error("Error reading session:", error);
    return null;
  }
}

export async function setSessionCookie(
  userId: string,
  role: Role = "CARETAKER",
  tokenVersion: number = 0
) {
  const cookieStore = await cookies();
  const token = await createSessionToken(userId, role, tokenVersion);

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
