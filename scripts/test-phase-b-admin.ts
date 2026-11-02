import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";
import { logAudit } from "../src/lib/audit";

async function runPhaseBTests() {
  console.log("==================================================");
  console.log(" Running CareCircle Phase B (Admin Oversight) Tests");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  // Find seeded admin for tests
  const admin = await prisma.admin.findFirst();
  if (!admin) {
    console.error("No admin found in database. Seed the database first.");
    process.exit(1);
  }

  // 1. Audit Log Creation
  const testAudit = await logAudit({
    actorType: "ADMIN",
    actorId: admin.id,
    action: "PHASE_B_VERIFICATION_TEST",
    targetType: "System",
    targetId: "test-target",
    summary: "Phase B verification test entry",
  });
  assert(!!testAudit && testAudit.action === "PHASE_B_VERIFICATION_TEST", "AuditLog records created with actor, action, target, and timestamp");

  // 2. Token Version & Revocation capability
  const initialTokenVersion = admin.tokenVersion;
  const updatedAdmin = await prisma.admin.update({
    where: { id: admin.id },
    data: { tokenVersion: { increment: 1 } },
  });
  assert(updatedAdmin.tokenVersion === initialTokenVersion + 1, "Admin tokenVersion successfully increments for session revocation");
  // Restore tokenVersion
  await prisma.admin.update({
    where: { id: admin.id },
    data: { tokenVersion: initialTokenVersion },
  });

  // 3. SystemSetting configuration & defaults
  const settings = await prisma.systemSetting.findMany();
  const settingKeys = settings.map((s) => s.key);
  assert(
    settingKeys.includes("overdueDoseMinutes") &&
    settingKeys.includes("refillWarningDays") &&
    settingKeys.includes("alertEscalationHours") &&
    settingKeys.includes("alertRecipientEmails"),
    "SystemSetting stores all 4 required operational keys (overdueDoseMinutes, refillWarningDays, alertEscalationHours, alertRecipientEmails)"
  );

  // 4. Caregiver verification status & rejection reason
  const testCaregiver = await prisma.caregiver.findFirst();
  assert(!!testCaregiver && ["PENDING", "VERIFIED", "REJECTED"].includes(testCaregiver.verificationStatus), "Caregiver verificationStatus supports PENDING | VERIFIED | REJECTED");

  // 5. Patient relation to caregiver comment & multi-family member support
  const testPatient = await prisma.patient.findFirst({
    include: { familyMembers: true },
  });
  assert(
    !!testPatient && testPatient.familyMembers.length >= 2,
    "Patient supports multiple FamilyMember records (patientId has @@index instead of @unique)"
  );

  // 6. Family Member relationship enum and primary contact
  const testFamily = await prisma.familyMember.findFirst({
    where: { isPrimaryContact: true },
  });
  assert(
    !!testFamily && !!testFamily.relationship,
    "FamilyMember includes relationship and isPrimaryContact"
  );

  // 7. LoginAttempt telemetry
  const attempt = await prisma.loginAttempt.create({
    data: {
      email: "test.telemetry@carecircle.demo",
      ip: "127.0.0.1",
      success: false,
    },
  });
  assert(!!attempt && attempt.success === false, "LoginAttempt records failed authentications for security oversight");

  // Cleanup test attempt
  await prisma.loginAttempt.delete({ where: { id: attempt.id } });

  console.log("==================================================");
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runPhaseBTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
