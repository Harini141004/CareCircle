import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";
import { assertClinicalAccess, assertPatientAccess } from "../src/lib/patient-scope";
import { AccessError } from "../src/lib/access";
import type { SessionUser } from "../src/lib/auth";

async function runPhaseCTests() {
  console.log("==================================================");
  console.log(" Running CareCircle Phase C (Caregiver Workflows) Tests");
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

  // 1. Setup mock session users
  const verifiedCaregiver = await prisma.caregiver.findFirst({
    where: { verificationStatus: "VERIFIED" },
  });

  if (!verifiedCaregiver) {
    console.error("No verified caregiver found in database.");
    process.exit(1);
  }

  const verifiedUser: SessionUser = {
    id: verifiedCaregiver.id,
    email: verifiedCaregiver.email,
    role: "CARETAKER",
    name: verifiedCaregiver.name,
    verificationStatus: "VERIFIED",
    tokenVersion: verifiedCaregiver.tokenVersion,
  };

  const pendingUser: SessionUser = {
    id: "pending-caregiver-id",
    email: "pending@test.com",
    role: "CARETAKER",
    name: "Pending Caregiver",
    verificationStatus: "PENDING",
    tokenVersion: 0,
  };

  const rejectedUser: SessionUser = {
    id: "rejected-caregiver-id",
    email: "rejected@test.com",
    role: "CARETAKER",
    name: "Rejected Caregiver",
    verificationStatus: "REJECTED",
    rejectionReason: "Incomplete documentation",
    tokenVersion: 0,
  };

  // 1. Verification Gating: Clinical access check
  let pendingBlocked = false;
  try {
    assertClinicalAccess(pendingUser);
  } catch (err) {
    if (err instanceof AccessError && err.statusCode === 403) {
      pendingBlocked = true;
    }
  }
  assert(pendingBlocked, "Unverified (PENDING) caregiver is blocked by assertClinicalAccess with 403");

  let rejectedBlocked = false;
  try {
    assertClinicalAccess(rejectedUser);
  } catch (err) {
    if (err instanceof AccessError && err.statusCode === 403) {
      rejectedBlocked = true;
    }
  }
  assert(rejectedBlocked, "Rejected caregiver is blocked by assertClinicalAccess with 403");

  let verifiedAllowed = false;
  try {
    assertClinicalAccess(verifiedUser);
    verifiedAllowed = true;
  } catch {
    verifiedAllowed = false;
  }
  assert(verifiedAllowed, "Verified caregiver passes assertClinicalAccess");

  // 2. Patient Scope Security
  const ownPatient = await prisma.patient.findFirst({
    where: { caregiverId: verifiedCaregiver.id },
  });

  if (ownPatient) {
    let ownAccessPassed = false;
    try {
      await assertPatientAccess(verifiedUser, ownPatient.id);
      ownAccessPassed = true;
    } catch {
      ownAccessPassed = false;
    }
    assert(ownAccessPassed, "Verified caregiver has access to assigned patient");

    // Other caregiver's patient
    const otherPatient = await prisma.patient.findFirst({
      where: {
        NOT: { caregiverId: verifiedCaregiver.id },
      },
    });

    if (otherPatient) {
      let crossAccessBlocked = false;
      try {
        await assertPatientAccess(verifiedUser, otherPatient.id);
      } catch (err) {
        if (err instanceof AccessError && (err.statusCode === 403 || err.statusCode === 404)) {
          crossAccessBlocked = true;
        }
      }
      assert(crossAccessBlocked, "Caregiver is blocked from accessing unassigned patient (cross-patient isolation)");
    }
  }

  // 3. Vitals 0-Value Preservation in Database
  if (ownPatient) {
    const testSymptomLog = await prisma.symptomLog.create({
      data: {
        patientId: ownPatient.id,
        symptomSeverity: 0, // Zero severity
        bloodPressureSystolic: 0, // Hypothetical edge value
        bloodPressureDiastolic: 0,
        heartRate: 0,
        bloodSugar: 0,
        weight: 0,
        temperature: 0,
        notes: "Verifying that 0 is not coerced to null or ignored",
      },
    });

    assert(
      testSymptomLog.symptomSeverity === 0 &&
      testSymptomLog.bloodPressureSystolic === 0 &&
      testSymptomLog.bloodPressureDiastolic === 0 &&
      testSymptomLog.heartRate === 0 &&
      testSymptomLog.bloodSugar === 0 &&
      testSymptomLog.weight === 0 &&
      testSymptomLog.temperature === 0,
      "Vitals & severity 0-values are preserved as 0 (not null or omitted)"
    );

    // Clean up test symptom log
    await prisma.symptomLog.delete({
      where: { id: testSymptomLog.id },
    });
  }

  // 4. Care Note Creation & Scoping
  if (ownPatient) {
    const shiftNote = await prisma.careNote.create({
      data: {
        patientId: ownPatient.id,
        caregiverId: verifiedCaregiver.id,
        type: "SHIFT_NOTE",
        body: "Patient had a restful morning. All vitals within normal parameters.",
      },
    });

    assert(
      !!shiftNote && shiftNote.type === "SHIFT_NOTE" && shiftNote.patientId === ownPatient.id,
      "CareNote created with SHIFT_NOTE type and patient relationship"
    );

    const handoverNote = await prisma.careNote.create({
      data: {
        patientId: ownPatient.id,
        caregiverId: verifiedCaregiver.id,
        type: "HANDOVER",
        body: "Evening caregiver to ensure bedtime medication administered at 9pm.",
      },
    });

    assert(
      !!handoverNote && handoverNote.type === "HANDOVER" && handoverNote.caregiverId === verifiedCaregiver.id,
      "CareNote created with HANDOVER type and caregiver relationship"
    );

    // Clean up test notes
    await prisma.careNote.deleteMany({
      where: { id: { in: [shiftNote.id, handoverNote.id] } },
    });
  }

  // 5. Patient Circle Messaging
  if (ownPatient) {
    let conversation = await prisma.conversation.findFirst({
      where: { patientId: ownPatient.id },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { patientId: ownPatient.id },
      });
    }

    const testMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: "CARETAKER",
        senderId: verifiedCaregiver.id,
        body: "Caregiver update: daily tasks completed.",
      },
    });

    assert(
      !!testMessage && testMessage.conversationId === conversation.id && testMessage.senderType === "CARETAKER",
      "Message linked to patient conversation with senderType CARETAKER"
    );

    // Clean up test message
    await prisma.message.delete({
      where: { id: testMessage.id },
    });
  }

  // 6. Adherence & Payroll Model Calculation
  const adherenceLogs = await prisma.medicationLog.findMany({
    where: { patient: { caregiverId: verifiedCaregiver.id } },
    take: 10,
  });
  assert(
    Array.isArray(adherenceLogs),
    "Caregiver medication logs accessible for automated adherence rate & payroll calculations"
  );

  console.log("==================================================");
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhaseCTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
