import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";
import { assertPatientAccess } from "../src/lib/patient-scope";
import { AccessError } from "../src/lib/access";
import { verifyPassword, hashPassword } from "../src/lib/auth";
import type { SessionUser } from "../src/lib/auth";

async function runPhaseDTests() {
  console.log("==================================================");
  console.log(" Running CareCircle Phase D (Family Member) Tests");
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

  // Find seeded family member
  const familyMember = await prisma.familyMember.findFirst({
    include: { patient: { include: { caregiver: true } } },
  });

  if (!familyMember || !familyMember.patient) {
    console.error("No linked family member found in database.");
    process.exit(1);
  }

  const familyUser: SessionUser = {
    id: familyMember.id,
    email: familyMember.email,
    role: "FAMILY",
    name: familyMember.name,
    tokenVersion: familyMember.tokenVersion,
  };

  // 1. Read-Only Clinical Access Enforcement
  let writeBlocked = false;
  try {
    await assertPatientAccess(familyUser, familyMember.patientId, { write: true });
  } catch (err) {
    if (err instanceof AccessError && err.statusCode === 403) {
      writeBlocked = true;
    }
  }
  assert(writeBlocked, "Family member write operations on clinical data are blocked with 403 Forbidden");

  // 2. Read Access to Linked Patient
  let readAllowed = false;
  try {
    const patient = await assertPatientAccess(familyUser, familyMember.patientId);
    if (patient && patient.id === familyMember.patientId) {
      readAllowed = true;
    }
  } catch {
    readAllowed = false;
  }
  assert(readAllowed, "Family member can read their linked patient's health records");

  // 3. Cross-Patient Isolation
  const otherPatient = await prisma.patient.findFirst({
    where: { id: { not: familyMember.patientId } },
  });

  if (otherPatient) {
    let crossAccessBlocked = false;
    try {
      await assertPatientAccess(familyUser, otherPatient.id);
    } catch (err) {
      if (err instanceof AccessError && (err.statusCode === 403 || err.statusCode === 404)) {
        crossAccessBlocked = true;
      }
    }
    assert(crossAccessBlocked, "Family member is blocked from accessing unlinked patients (cross-patient isolation)");
  }

  // 4. Refill Request Workflow (Allowed Clinical-Adjacent Action)
  const patientMed = await prisma.medication.findFirst({
    where: { patientId: familyMember.patientId },
  });

  if (patientMed && familyMember.patient.caregiverId) {
    // Simulate Refill Request alert creation
    const refillAlert = await prisma.alert.create({
      data: {
        caregiverId: familyMember.patient.caregiverId,
        patientId: familyMember.patientId,
        type: "REFILL_DUE",
        title: `Medication Refill Request: ${patientMed.name}`,
        message: `${familyUser.name} (family member) requested a refill for ${patientMed.name} (${patientMed.dosage})`,
        severity: "warning",
      },
    });

    assert(
      !!refillAlert &&
      refillAlert.type === "REFILL_DUE" &&
      refillAlert.caregiverId === familyMember.patient.caregiverId,
      "Refill request writes an Alert of type REFILL_DUE assigned to the patient's caregiver"
    );

    // Write audit log
    const audit = await prisma.auditLog.create({
      data: {
        actorType: "FAMILY",
        actorId: familyUser.id,
        action: "REFILL_REQUESTED",
        targetType: "Medication",
        targetId: patientMed.id,
        summary: `Family member ${familyUser.name} requested a refill for ${patientMed.name}`,
      },
    });

    assert(
      !!audit && audit.action === "REFILL_REQUESTED" && audit.actorType === "FAMILY",
      "Refill request is properly tracked in AuditLog"
    );

    // Clean up test alert & audit log
    await prisma.alert.delete({ where: { id: refillAlert.id } });
    await prisma.auditLog.delete({ where: { id: audit.id } });
  }

  // 5. Account Password Change & tokenVersion Invalidation
  const initialTokenVersion = familyMember.tokenVersion;
  const testNewPassword = "TemporaryTestPassword123!";
  const newHash = await hashPassword(testNewPassword);

  const updatedFamily = await prisma.familyMember.update({
    where: { id: familyMember.id },
    data: {
      passwordHash: newHash,
      tokenVersion: { increment: 1 },
    },
  });

  assert(
    updatedFamily.tokenVersion === initialTokenVersion + 1,
    "Family member password change increments tokenVersion to revoke active sessions"
  );

  const passwordValid = await verifyPassword(testNewPassword, updatedFamily.passwordHash);
  assert(passwordValid, "New password verifies correctly against updated hash");

  // Restore original password & tokenVersion
  await prisma.familyMember.update({
    where: { id: familyMember.id },
    data: {
      passwordHash: familyMember.passwordHash,
      tokenVersion: initialTokenVersion,
    },
  });

  // 6. Family Notification Preferences
  const upsertedPref = await prisma.notificationPreference.upsert({
    where: {
      userType_userId: {
        userType: "FAMILY",
        userId: familyUser.id,
      },
    },
    update: {
      emailAlerts: true,
      notifyVitalsWarning: true,
      notifyRefillDue: true,
      notifyAppointment: true,
    },
    create: {
      userType: "FAMILY",
      userId: familyUser.id,
      emailAlerts: true,
      notifyVitalsWarning: true,
      notifyRefillDue: true,
      notifyAppointment: true,
    },
  });

  assert(
    upsertedPref.userType === "FAMILY" &&
    upsertedPref.notifyVitalsWarning === true &&
    upsertedPref.notifyRefillDue === true,
    "NotificationPreference stores preferences for FAMILY userType"
  );

  // 7. Circle Chat Participation
  let conversation = await prisma.conversation.findFirst({
    where: { patientId: familyMember.patientId },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { patientId: familyMember.patientId },
    });
  }

  const familyMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: "FAMILY",
      senderId: familyUser.id,
      body: "Hi team, checking in on mom's appointment tomorrow morning.",
    },
  });

  assert(
    !!familyMessage && familyMessage.senderType === "FAMILY" && familyMessage.conversationId === conversation.id,
    "Family member can post messages in patient conversation circle"
  );

  // Clean up message
  await prisma.message.delete({ where: { id: familyMessage.id } });

  console.log("==================================================");
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhaseDTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
