import { getSessionUser, SessionUser, Role, homePathForRole } from "./auth";
import { redirect } from "next/navigation";

export class AccessError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AccessError";
    this.statusCode = statusCode;
  }
}

/**
 * Ensures an active user is logged in.
 * Throws an AccessError with status 401 if not authenticated.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AccessError("Unauthorized", 401);
  }
  return user;
}

/**
 * Ensures the logged-in user possesses one of the allowed roles.
 * Throws AccessError (401 if unauthenticated, 403 if forbidden).
 */
export async function requireRole(...allowedRoles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    throw new AccessError("Forbidden: Insufficient permissions", 403);
  }
  return user;
}

/**
 * Server-side role guard for page components.
 * Redirects to /login if user is not authenticated.
 * Redirects to user's home path if they try to access a page of another role.
 * Returns the authenticated user.
 */
export async function guardPageRole(...allowedRoles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    redirect(homePathForRole(user.role));
  }
  return user;
}

/**
 * Ensures the logged-in caregiver is VERIFIED before accessing clinical pages or APIs.
 * Admins are also permitted.
 * Throws 403 if caregiver is PENDING or REJECTED.
 */
export async function requireVerifiedCaregiver(): Promise<SessionUser> {
  const user = await requireRole("CARETAKER", "ADMIN");
  if (user.role === "CARETAKER" && user.verificationStatus !== "VERIFIED") {
    throw new AccessError(
      user.verificationStatus === "REJECTED"
        ? `Account verification rejected: ${user.rejectionReason || "Please review your qualifications."}`
        : "Account awaiting administrative verification",
      403
    );
  }
  return user;
}

/**
 * Server-side guard for caregiver clinical pages.
 * - Redirects unauthenticated users to /login.
 * - Redirects other roles to their respective home paths.
 * - Redirects PENDING/REJECTED caregivers to /verification-status.
 */
export async function guardCaregiverClinicalPage(): Promise<SessionUser> {
  const user = await guardPageRole("CARETAKER");
  if (user.verificationStatus !== "VERIFIED") {
    redirect("/verification-status");
  }
  return user;
}
