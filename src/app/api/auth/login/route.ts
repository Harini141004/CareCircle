import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, verifyPassword, homePathForRole, Role } from "@/lib/auth";

// In-memory rate limiting for failed login attempts
// 5 failed attempts per email + IP per 15 minutes
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const loginRateLimitMap = new Map<string, RateLimitEntry>();
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "unknown-ip";
}

function checkRateLimit(key: string): { isBlocked: boolean; timeLeftSec?: number } {
  const now = Date.now();
  const entry = loginRateLimitMap.get(key);

  if (!entry) return { isBlocked: false };

  if (now > entry.resetAt) {
    loginRateLimitMap.delete(key);
    return { isBlocked: false };
  }

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    const timeLeftSec = Math.ceil((entry.resetAt - now) / 1000);
    return { isBlocked: true, timeLeftSec };
  }

  return { isBlocked: false };
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const entry = loginRateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    loginRateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearRateLimit(key: string) {
  loginRateLimitMap.delete(key);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.email || !body.password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const email = String(body.email).toLowerCase().trim();
    const password = String(body.password);
    const clientIp = getClientIp(req);
    const rateLimitKey = `${email}:${clientIp}`;

    // 1. Enforce Rate Limit
    const rateLimit = checkRateLimit(rateLimitKey);
    if (rateLimit.isBlocked) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please try again in ${rateLimit.timeLeftSec} seconds.`,
        },
        { status: 429 }
      );
    }

    // 2. Search for user across Caregiver, Admin, FamilyMember
    let user: { id: string; email: string; name: string; passwordHash: string; isActive?: boolean } | null = null;
    let role: Role = "CARETAKER";

    const caregiver = await prisma.caregiver.findUnique({
      where: { email },
    });

    if (caregiver) {
      user = caregiver;
      role = "CARETAKER";
    } else {
      const admin = await prisma.admin.findUnique({ where: { email } });
      if (admin) {
        user = admin;
        role = "ADMIN";
      } else {
        const family = await prisma.familyMember.findUnique({ where: { email } });
        if (family) {
          user = family;
          role = "FAMILY";
        }
      }
    }

    // 3. Constant-time check / generic error message for unknown user or wrong password
    if (!user) {
      recordFailedAttempt(rateLimitKey);
      await (prisma as any).loginAttempt?.create({ data: { email, ip: clientIp, success: false } }).catch(() => {});
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordFailedAttempt(rateLimitKey);
      await (prisma as any).loginAttempt?.create({ data: { email, ip: clientIp, success: false } }).catch(() => {});
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // 4. Reject inactive accounts
    if ("isActive" in user && user.isActive === false) {
      await (prisma as any).loginAttempt?.create({ data: { email, ip: clientIp, success: false } }).catch(() => {});
      return NextResponse.json(
        { error: "Account has been deactivated. Please contact an administrator." },
        { status: 403 }
      );
    }

    // 5. Successful login: clear rate limit, update lastLoginAt, log attempt, and issue signed JWT session
    clearRateLimit(rateLimitKey);

    const now = new Date();
    if (role === "ADMIN") {
      await prisma.admin.update({ where: { id: user.id }, data: { lastLoginAt: now } as any }).catch(() => {});
    } else if (role === "CARETAKER") {
      await prisma.caregiver.update({ where: { id: user.id }, data: { lastLoginAt: now } as any }).catch(() => {});
    } else if (role === "FAMILY") {
      await prisma.familyMember.update({ where: { id: user.id }, data: { lastLoginAt: now } as any }).catch(() => {});
    }
    await (prisma as any).loginAttempt?.create({ data: { email, ip: clientIp, success: true } }).catch(() => {});

    const tokenVersion = (user as any).tokenVersion ?? 0;
    await setSessionCookie(user.id, role, tokenVersion);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
      },
      redirectUrl: homePathForRole(role),
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
