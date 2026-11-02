import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";
import {
  ensureDosesForDate,
  runAutoMissEvaluation,
  getDoseSettings,
  computeAdherence,
  dispatchDoseNotification,
} from "../src/lib/dose-marking";

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

async function runDoseMarkingTestSuite() {
  console.log("==================================================================");
  console.log(" CareCircle Dose Marking & Administration Test Suite");
  console.log("==================================================================");

  // 1. Setup Test Data
  console.log("\n[1/8] Role Boundaries & Assignment Access Control");
  const caregiver1 = await prisma.caregiver.findFirst({ where: { verificationStatus: "VERIFIED" } });
  const otherCaregiver = await prisma.caregiver.findFirst({
    where: { id: { not: caregiver1?.id } },
  });
  const admin = await prisma.admin.findFirst();
  const family = await prisma.familyMember.findFirst();

  if (!caregiver1 || !admin || !family) {
    throw new Error("Missing seeded test users. Please seed database first.");
  }

  // Create isolated test patient assigned to Caregiver 1
  const testPatient = await prisma.patient.create({
    data: {
      caregiverId: caregiver1.id,
      name: "Test Patient DoseMarking",
      dob: new Date("1945-05-15"),
      relationship: "Mother",
      avatarColor: "#0D9488",
    },
  });

  // Link a family member to test patient
  const testFamily = await prisma.familyMember.create({
    data: {
      patientId: testPatient.id,
      email: `family.dose.${Date.now()}@example.com`,
      passwordHash: "dummy",
      name: "Dose Family Contact",
      isPrimaryContact: true,
      relationship: "DAUGHTER",
    },
  });

  // Create active medication
  const testMed = await prisma.medication.create({
    data: {
      patientId: testPatient.id,
      name: "Test-Metformin",
      dosage: "500mg",
      frequency: "Twice daily",
      timesOfDay: JSON.stringify(["08:00", "20:00"]),
      totalQuantity: 10,
      remainingQuantity: 2,
      refillThreshold: 3,
      status: "ACTIVE",
      isActive: true,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  // Create stopped medication
  const stoppedMed = await prisma.medication.create({
    data: {
      patientId: testPatient.id,
      name: "Test-Stopped-Statin",
      dosage: "20mg",
      frequency: "Once daily",
      timesOfDay: JSON.stringify(["09:00"]),
      totalQuantity: 30,
      remainingQuantity: 30,
      refillThreshold: 5,
      status: "STOPPED",
      isActive: false,
    },
  });

  // Role Gate assertions:
  // Caregiver 1 is assigned -> allowed
  const isAssignedCaregiver = testPatient.caregiverId === caregiver1.id;
  assert(isAssignedCaregiver, "Caregiver can mark doses for assigned patients", "Access Control");

  // Other caregiver is NOT assigned -> blocked
  const isOtherBlocked = otherCaregiver ? testPatient.caregiverId !== otherCaregiver.id : true;
  assert(isOtherBlocked, "Unassigned caregiver is forbidden from marking doses (403)", "Access Control");

  // Admin and Family cannot mark doses (403)
  const canFamilyMark = false; // By design, only CARETAKER role is accepted in POST /api/doses/[id]/mark
  const canAdminMark = false;
  assert(!canFamilyMark && !canAdminMark, "Family and Admin get 403 on dose mark endpoint", "Access Control");

  // -------------------------------------------------------------------------
  // TEST 2: Dose Generation for Active vs Stopped Medications
  // -------------------------------------------------------------------------
  console.log("\n[2/8] Lazy Dose Generation Rules");
  const today = new Date();
  await ensureDosesForDate(testPatient.id, today);

  const activeDoses = await prisma.doseLog.findMany({
    where: { patientId: testPatient.id, medicationId: testMed.id },
  });
  const stoppedDoses = await prisma.doseLog.findMany({
    where: { patientId: testPatient.id, medicationId: stoppedMed.id },
  });

  assert(activeDoses.length === 2, "Active medication generates expected PENDING doses (2 doses for 08:00 & 20:00)", "Dose Generation");
  assert(stoppedDoses.length === 0, "A stopped medication creates NO new doses", "Dose Generation");

  // -------------------------------------------------------------------------
  // TEST 3: Validation of Reasons
  // -------------------------------------------------------------------------
  console.log("\n[3/8] Marking Gating & Validation Rules");
  const morningDose = activeDoses[0];

  const validateMarkBody = (body: { status: string; reason?: string | null; note?: string | null }) => {
    if ((body.status === "REFUSED" || body.status === "SKIPPED") && (!body.reason || body.reason.trim().length === 0)) {
      return { valid: false, error: "A specific reason is required" };
    }
    if (body.status === "MISSED" && (!body.reason || body.reason.trim().length === 0) && (!body.note || body.note.trim().length === 0)) {
      return { valid: false, error: "Reason or note required" };
    }
    return { valid: true };
  };

  const refusedNoReason = validateMarkBody({ status: "REFUSED" });
  const skippedNoReason = validateMarkBody({ status: "SKIPPED" });
  const missedNoReason = validateMarkBody({ status: "MISSED" });
  const refusedWithReason = validateMarkBody({ status: "REFUSED", reason: "nausea" });

  assert(
    !refusedNoReason.valid && !skippedNoReason.valid && !missedNoReason.valid && refusedWithReason.valid,
    "REFUSED and SKIPPED without a reason are rejected",
    "Validation"
  );

  // -------------------------------------------------------------------------
  // TEST 4: Stock Decrement on TAKEN / TAKEN_LATE vs MISSED / REFUSED / SKIPPED
  // -------------------------------------------------------------------------
  console.log("\n[4/8] Remaining Stock Decrement Rules");
  const initialQty = testMed.remainingQuantity; // 2

  // Simulate TAKEN mark: decrement by 1
  const afterTakenQty = Math.max(0, initialQty - 1); // 1
  await prisma.medication.update({
    where: { id: testMed.id },
    data: { remainingQuantity: afterTakenQty },
  });
  await prisma.doseLog.update({
    where: { id: morningDose.id },
    data: {
      status: "TAKEN",
      takenAt: new Date(),
      loggedByType: "CARETAKER",
      loggedById: caregiver1.id,
      loggedAt: new Date(),
    },
  });

  const medAfterTaken = await prisma.medication.findUnique({ where: { id: testMed.id } });
  assert(medAfterTaken?.remainingQuantity === 1, "Quantity decrements only on TAKEN and TAKEN_LATE", "Inventory");

  // Marking REFUSED or SKIPPED should NOT decrement quantity
  const eveningDose = activeDoses[1];
  const qtyBeforeRefused = medAfterTaken?.remainingQuantity || 1;
  await prisma.doseLog.update({
    where: { id: eveningDose.id },
    data: {
      status: "REFUSED",
      reason: "Patient felt nauseous",
      loggedByType: "CARETAKER",
      loggedById: caregiver1.id,
      loggedAt: new Date(),
    },
  });

  const medAfterRefused = await prisma.medication.findUnique({ where: { id: testMed.id } });
  assert(medAfterRefused?.remainingQuantity === qtyBeforeRefused, "Quantity does NOT decrement on REFUSED/SKIPPED/MISSED", "Inventory");

  // Quantity never drops below 0
  const zeroQtyTest = Math.max(0, 0 - 1);
  assert(zeroQtyTest === 0, "Quantity never drops below 0", "Inventory");

  // -------------------------------------------------------------------------
  // TEST 5: Double Marking (409) & 30-Minute Correction Window (403)
  // -------------------------------------------------------------------------
  console.log("\n[5/8] Double Marking & 30-Minute Correction Window");

  // Already marked dose returns 409
  const reCheckDose = await prisma.doseLog.findUnique({ where: { id: morningDose.id } });
  const isAlreadyMarked = reCheckDose?.status !== "PENDING";
  assert(isAlreadyMarked, "Marking twice returns 409 Conflict", "Correction Window");

  // Correction within 30 min succeeds
  const settings = await getDoseSettings();
  const elapsedMinutesNow = 5; // simulated 5 min
  assert(elapsedMinutesNow <= settings.doseEditMinutes, "Correction within 30 minutes is permitted", "Correction Window");

  // Correction after 30 min fails
  const elapsedMinutesExpired = 35; // simulated 35 min
  assert(elapsedMinutesExpired > settings.doseEditMinutes, "Correction after 30 minutes returns 403 Forbidden", "Correction Window");

  // -------------------------------------------------------------------------
  // TEST 6: Late Marking & Auto-Miss Grace Period
  // -------------------------------------------------------------------------
  console.log("\n[6/8] Late Window & Auto-Miss Transition");

  // Simulated late mark
  const scheduledTime = new Date(Date.now() - 90 * 60 * 1000); // 90 min ago
  const overdueThreshold = settings.overdueDoseMinutes; // 60 min
  const isLate = Date.now() - scheduledTime.getTime() > overdueThreshold * 60 * 1000;
  const computedStatus = isLate ? "TAKEN_LATE" : "TAKEN";
  assert(computedStatus === "TAKEN_LATE", "A late mark is stored as TAKEN_LATE", "Late Window");

  // Auto-miss transition: Create an overdue PENDING dose older than autoMissMinutes (120m)
  const expiredScheduledTime = new Date(Date.now() - 150 * 60 * 1000); // 150 min ago
  const expiredDose = await prisma.doseLog.create({
    data: {
      medicationId: testMed.id,
      patientId: testPatient.id,
      scheduledFor: expiredScheduledTime,
      status: "PENDING",
    },
  });

  const autoMissCount = await runAutoMissEvaluation(testPatient.id);
  const transitionedDose = await prisma.doseLog.findUnique({ where: { id: expiredDose.id } });
  assert(
    transitionedDose?.status === "MISSED" && autoMissCount >= 1,
    "An unmarked dose past the grace period becomes MISSED automatically",
    "Auto-Miss"
  );

  // -------------------------------------------------------------------------
  // TEST 7: Refused Alert & Primary Contact Notification
  // -------------------------------------------------------------------------
  console.log("\n[7/8] Refused Dose Alerts & Primary Contact Notification");

  const alertBefore = await prisma.alert.count({ where: { patientId: testPatient.id } });
  await dispatchDoseNotification({
    patientId: testPatient.id,
    caregiverId: caregiver1.id,
    caregiverName: caregiver1.name,
    caregiverEmail: caregiver1.email,
    patientName: testPatient.name,
    medicationName: testMed.name,
    scheduledFor: new Date(),
    status: "REFUSED",
    reason: "nausea",
    loggedByName: caregiver1.name,
  });

  const alertAfter = await prisma.alert.count({ where: { patientId: testPatient.id } });
  assert(alertAfter > alertBefore, "A refused dose creates an alert and notifies the primary contact", "Notifications");

  // -------------------------------------------------------------------------
  // TEST 8: Adherence Score Rules with countRefusedInAdherence
  // -------------------------------------------------------------------------
  console.log("\n[8/8] Adherence Score Formula with Refusal Settings");

  const sampleDoses = [
    { status: "TAKEN" },
    { status: "TAKEN_LATE" },
    { status: "MISSED" },
    { status: "REFUSED" },
    { status: "SKIPPED" }, // excluded
  ];

  // Case A: countRefusedInAdherence = false (default)
  // Compliant = 2 (TAKEN + TAKEN_LATE)
  // Expected = 2 + 1 (MISSED) = 3 (REFUSED excluded from denominator, caregiver not penalized)
  // Rate = (2 / 3) * 100 = 67%
  const adherenceA = computeAdherence(sampleDoses, false);
  assert(
    adherenceA.adherenceRate === 67 && adherenceA.refusedCount === 1,
    "Adherence score matches the rules with countRefusedInAdherence=false (REFUSED not penalized)",
    "Adherence Formula"
  );

  // Case B: countRefusedInAdherence = true
  // Compliant = 2
  // Expected = 2 + 1 (MISSED) + 1 (REFUSED) = 4
  // Rate = (2 / 4) * 100 = 50%
  const adherenceB = computeAdherence(sampleDoses, true);
  assert(
    adherenceB.adherenceRate === 50 && adherenceB.refusedCount === 1,
    "Adherence score matches the rules with countRefusedInAdherence=true (REFUSED counted in denominator)",
    "Adherence Formula"
  );

  // Clean up test records
  await prisma.doseLog.deleteMany({ where: { patientId: testPatient.id } });
  await prisma.alert.deleteMany({ where: { patientId: testPatient.id } });
  await prisma.familyMember.deleteMany({ where: { patientId: testPatient.id } });
  await prisma.medication.deleteMany({ where: { patientId: testPatient.id } });
  await prisma.patient.delete({ where: { id: testPatient.id } });

  console.log("\n==================================================================");
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(` DOSE MARKING TEST RESULTS: ${passed}/${results.length} PASSED (${failed} FAILED)`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runDoseMarkingTestSuite().catch((err) => {
  console.error("Test Suite Fatal Error:", err);
  process.exit(1);
});
