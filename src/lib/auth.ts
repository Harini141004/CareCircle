import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "carecircle_session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionId) return null;

    // Simple encoded session format: caregiverId:base64
    const caregiverId = Buffer.from(sessionId, "base64").toString("utf-8");
    if (!caregiverId) return null;

    const caregiver = await prisma.caregiver.findUnique({
      where: { id: caregiverId },
      select: { id: true, email: true, name: true },
    });

    return caregiver;
  } catch (error) {
    console.error("Error reading session:", error);
    return null;
  }
}

export async function setSessionCookie(caregiverId: string) {
  const cookieStore = await cookies();
  const encoded = Buffer.from(caregiverId).toString("base64");
  
  cookieStore.set(SESSION_COOKIE, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
