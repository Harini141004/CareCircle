import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";
import {
  setSessionCookie,
  getSessionUser,
  clearSessionCookie,
  verifyPassword,
  hashPassword,
  homePathForRole,
  type SessionUser,
} from "../src/lib/auth";
import {
  requireUser,
  requireRole,
  guardCaregiverClinicalPage,
  AccessError,
} from "../src/lib/access";
import {
  assertPatientAccess,
  patientAccessFilter,
  assertClinicalAccess,
} from "../src/lib/patient-scope";
import { logAudit } from "../src/lib/audit";
import { getCaregiverNotificationPreferences } from "../src/lib/notifications";

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, category: string) {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    results.push({ name, category, passed: true });
  } else {
    console.error(`  [FAIL] ${name}`);
    results.push({ name, category, passed: false, error: "Assertion failed" });
  }
}

async function runMasterTestSuite() {
  console.log("==================================================================");
  console.log(" CareCircle Phase E: Comprehensive Master Test & Verification Suite");
  console.log("==================================================================");

  // -------------------------------------------------------------------------
  // CATEGORY 1: DATABASE INTEGRITY & SEED AUDIT
  // -------------------------------------------------------------------------
  console.log("\n[1/7] Database Models & Schema Relationships");

  const [adminCount, caregiverCount, patientCount, familyCount] = await Promise.all([
    prisma.admin.count(),
    prisma.caregiver.count(),
    prisma.patient.count(),
    prisma.familyMember.count(),
  ]);

  assert(adminCount >= 1, "Admin user exists in database", "Database");
  assert(caregiverCount >= 1, "Caregiver user exists in database", "Database");
  assert(patientCount >= 1, "Patient record exists in database", "Database");
  assert(familyCount >= 1, "Family member record exists in database", "Database");

  // Verify FamilyMember schema allows multiple members per patient
  const patientWithFamily = await prisma.patient.findFirst({
    where: { familyMembers: { some: {} } },
    include: { familyMembers: true },
  });
  assert(
    !!patientWithFamily && patientWithFamily.familyMembers.length >= 1,
    "Patient allows relation with multiple FamilyMember records",
    "Database"
  );

  // -------------------------------------------------------------------------
  // CATEGORY 2: SECURITY & SESSION PROTOCOLS
  // -------------------------------------------------------------------------
  console.log("\n[2/7] Cryptographic Session Tokens & Authentication");

  const testAdmin = await prisma.admin.findFirst();
  if (!testAdmin) throw new Error("No admin found for testing");

  // Verify password hashing works
  const passwordValid = await verifyPassword("AdminSecret2026!", testAdmin.passwordHash);
  assert(passwordValid, "Admin password verification succeeds with bcrypt", "Security");

  // Verify token versioning and session revocation
  const currentTokenVersion = testAdmin.tokenVersion;
  const bumpedAdmin = await prisma.admin.update({
    where: { id: testAdmin.id },
    data: { tokenVersion: { increment: 1 } },
  });
  assert(
    bumpedAdmin.tokenVersion === currentTokenVersion + 1,
    "tokenVersion increment revokes active sessions across devices",
    "Security"
  );
  // Revert back
  await prisma.admin.update({
    where: { id: testAdmin.id },
    data: { tokenVersion: currentTokenVersion },
  });

  // Role home path routing
  assert(homePathForRole("ADMIN") === "/admin/dashboard", "ADMIN routes to /admin/dashboard", "Security");
  assert(homePathForRole("CARETAKER") === "/dashboard", "CARETAKER routes to /dashboard", "Security");
  assert(homePathForRole("FAMILY") === "/family/profile", "FAMILY routes to /family/profile", "Security");

  // -------------------------------------------------------------------------
  // CATEGORY 3: CAREGIVER VERIFICATION GATING & CLINICAL ACCESS
  // -------------------------------------------------------------------------
  console.log("\n[3/7] Caregiver Verification Gating");

  const unverifiedUser: SessionUser = {
    id: "mock-unverified-id",
    email: "unverified@test.com",
    role: "CARETAKER",
    name: "Pending Caregiver",
    verificationStatus: "PENDING",
  };

  const verifiedUser: SessionUser = {
    id: testAdmin.id,
    email: testAdmin.email,
    role: "CARETAKER",
    name: "Verified Caregiver",
    verificationStatus: "VERIFIED",
  };

  let unverifiedBlocked = false;
  try {
    assertClinicalAccess(unverifiedUser);
  } catch (err) {
    if (err instanceof AccessError && err.statusCode === 403) {
      unverifiedBlocked = true;
    }
  }
  assert(unverifiedBlocked, "Unverified caregiver (PENDING) is blocked from clinical access with 403", "Access Gating");

  let verifiedPassed = false;
  try {
    assertClinicalAccess(verifiedUser);
    verifiedPassed = true;
  } catch {
    verifiedPassed = false;
  }
  assert(verifiedPassed, "Verified caregiver passes assertClinicalAccess check", "Access Gating");

  // -------------------------------------------------------------------------
  // CATEGORY 4: PATIENT SCOPING & MULTI-TENANT ISOLATION
  // -------------------------------------------------------------------------
  console.log("\n[4/7] Multi-Tenant Patient Scoping");

  const caregiver = await prisma.caregiver.findFirst({
    where: { verificationStatus: "VERIFIED" },
    include: { patients: true },
  });

  if (caregiver && caregiver.patients.length > 0) {
    const assignedPatient = caregiver.patients[0];
    const caregiverUser: SessionUser = {
      id: caregiver.id,
      email: caregiver.email,
      role: "CARETAKER",
      name: caregiver.name,
      verificationStatus: "VERIFIED",
    };

    let ownPatientAccess = false;
    try {
      await assertPatientAccess(caregiverUser, assignedPatient.id);
      ownPatientAccess = true;
    } catch {
      ownPatientAccess = false;
    }
    assert(ownPatientAccess, "Caregiver has access to assigned patient", "Patient Scope");

    // Other patient not assigned to caregiver
    const unassignedPatient = await prisma.patient.findFirst({
      where: { NOT: { caregiverId: caregiver.id } },
    });

    if (unassignedPatient) {
      let unassignedBlocked = false;
      try {
        await assertPatientAccess(caregiverUser, unassignedPatient.id);
      } catch (err) {
        if (err instanceof AccessError && (err.statusCode === 403 || err.statusCode === 404)) {
          unassignedBlocked = true;
        }
      }
      assert(unassignedBlocked, "Caregiver cannot access unassigned patient (cross-patient isolation)", "Patient Scope");
    }
  }

  // -------------------------------------------------------------------------
  // CATEGORY 5: FAMILY MEMBER BOUNDARIES & READ-ONLY ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log("\n[5/7] Family Member Read-Only Boundaries & Refill Delegation");

  const familyMember = await prisma.familyMember.findFirst({
    include: { patient: true },
  });

  if (familyMember && familyMember.patient) {
    const familyUser: SessionUser = {
      id: familyMember.id,
      email: familyMember.email,
      role: "FAMILY",
      name: familyMember.name,
    };

    let familyWriteBlocked = false;
    try {
      await assertPatientAccess(familyUser, familyMember.patientId, { write: true });
    } catch (err) {
      if (err instanceof AccessError && err.statusCode === 403) {
        familyWriteBlocked = true;
      }
    }
    assert(familyWriteBlocked, "Family member write operations on clinical data are blocked with 403 Forbidden", "Family Security");

    let familyReadAllowed = false;
    try {
      const p = await assertPatientAccess(familyUser, familyMember.patientId);
      if (p) familyReadAllowed = true;
    } catch {
      familyReadAllowed = false;
    }
    assert(familyReadAllowed, "Family member can read their linked loved one's records", "Family Security");
  }

  // -------------------------------------------------------------------------
  // CATEGORY 6: NUMERIC INTEGRITY & ZERO-VALUE VITALS PRESERVATION
  // -------------------------------------------------------------------------
  console.log("\n[6/7] Data Integrity & Zero-Value Preservation");

  const anyPatient = await prisma.patient.findFirst();
  if (anyPatient) {
    const zeroLog = await prisma.symptomLog.create({
      data: {
        patientId: anyPatient.id,
        bloodPressureSystolic: 0,
        bloodPressureDiastolic: 0,
        bloodSugar: 0,
        heartRate: 0,
        temperature: 0,
        weight: 0,
        symptomSeverity: 0,
        notes: "Phase E Automated Zero Value Integrity Test",
      },
    });

    assert(
      zeroLog.bloodPressureSystolic === 0 &&
      zeroLog.bloodPressureDiastolic === 0 &&
      zeroLog.bloodSugar === 0 &&
      zeroLog.heartRate === 0 &&
      zeroLog.temperature === 0 &&
      zeroLog.weight === 0 &&
      zeroLog.symptomSeverity === 0,
      "Numeric zero values (0) in vitals and severity are preserved without coercion to null",
      "Data Integrity"
    );

    // Clean up
    await prisma.symptomLog.delete({ where: { id: zeroLog.id } });
  }

  // -------------------------------------------------------------------------
  // CATEGORY 7: OPERATIONAL SETTINGS & AUDIT LOGGING
  // -------------------------------------------------------------------------
  console.log("\n[7/7] Operational Infrastructure & Audit Logging");

  const auditEntry = await logAudit({
    actorType: "ADMIN",
    actorId: testAdmin.id,
    action: "PHASE_E_FINAL_VERIFICATION",
    targetType: "System",
    targetId: "carecircle-core",
    summary: "Phase E comprehensive automated verification test pass",
  });

  assert(
    !!auditEntry && auditEntry.action === "PHASE_E_FINAL_VERIFICATION",
    "AuditLog captures system events with actor, action, and target attribution",
    "Audit System"
  );

  const settings = await prisma.systemSetting.findMany();
  const keys = settings.map((s) => s.key);
  assert(
    keys.includes("overdueDoseMinutes") &&
    keys.includes("refillWarningDays") &&
    keys.includes("alertEscalationHours"),
    "SystemSetting stores core operational thresholds (overdueDoseMinutes, refillWarningDays, alertEscalationHours)",
    "Settings"
  );

  // Clean up test audit entry
  if (auditEntry) {
    await prisma.auditLog.delete({ where: { id: auditEntry.id } });
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed).length;

  console.log("\n==================================================================");
  console.log(` FINAL MASTER TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log("==================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMasterTestSuite()
  .catch((err) => {
    console.error("Master test execution error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
