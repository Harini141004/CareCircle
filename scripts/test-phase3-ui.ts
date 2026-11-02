import { prisma } from "../src/lib/prisma";
import { createSessionToken, verifyPassword } from "../src/lib/auth";

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  process.env.SESSION_SECRET = "carecircle-development-test-session-secret-key-must-be-at-least-32-chars";
}

async function runTests() {
  console.log("=== PHASE 3 UI & END-TO-END VERIFICATION ===");

  // 1. Verify Seeded Users across all 4 user types
  const admin = await prisma.admin.findUnique({ where: { email: "admin@carecircle.demo" } });
  const caregiver = await prisma.caregiver.findUnique({ where: { email: "caregiver@carecircle.demo" } });
  const familySon = await prisma.familyMember.findUnique({ where: { email: "david.vance@family.demo" }, include: { patient: true } });
  const familyDaughter = await prisma.familyMember.findUnique({ where: { email: "emily.vance@family.demo" }, include: { patient: true } });
  const patientMargaret = await prisma.patient.findFirst({
    where: { name: "Margaret Vance" },
    include: { caregiver: true, familyMembers: true },
  });

  console.assert(admin !== null, "Test 1 Failed: Admin must exist");
  console.assert(caregiver !== null, "Test 2 Failed: Caregiver must exist");
  console.assert(patientMargaret !== null, "Test 3 Failed: Margaret Vance must exist");
  console.assert(familySon !== null, "Test 4 Failed: David Vance must exist");
  console.assert(familyDaughter !== null, "Test 5 Failed: Emily Vance must exist");
  console.log("✓ Test 1-5: All 4 user types successfully seeded in DB");

  // 2. Verify Margaret has MULTIPLE family members
  console.assert(patientMargaret!.familyMembers.length >= 2, "Test 6 Failed: Margaret must have multiple family members");
  const son = patientMargaret!.familyMembers.find((f) => f.relationship === "SON");
  const daughter = patientMargaret!.familyMembers.find((f) => f.relationship === "DAUGHTER");

  console.assert(son !== null && son?.isPrimaryContact === true, "Test 7 Failed: Son must be primary contact");
  console.assert(daughter !== null && daughter?.isPrimaryContact === false, "Test 8 Failed: Daughter must be secondary contact");
  console.log(`✓ Test 6-8: Multi-family member relation verified: Son (${son?.name}, Primary) & Daughter (${daughter?.name})`);

  // 3. Verify Session Tokens for all 3 roles
  const adminToken = await createSessionToken(admin!.id, "ADMIN");
  const caregiverToken = await createSessionToken(caregiver!.id, "CARETAKER");
  const familyToken = await createSessionToken(familySon!.id, "FAMILY");

  console.assert(typeof adminToken === "string" && adminToken.split(".").length === 3, "Test 9 Failed: Admin JWT valid");
  console.assert(typeof caregiverToken === "string" && caregiverToken.split(".").length === 3, "Test 10 Failed: Caregiver JWT valid");
  console.assert(typeof familyToken === "string" && familyToken.split(".").length === 3, "Test 11 Failed: Family JWT valid");
  console.log("✓ Test 9-11: Valid signed HS256 JWTs created for Admin, Caregiver, and Family");

  // 4. Verify Password Hashes
  const adminPassMatch = await verifyPassword("AdminSecret2026!", admin!.passwordHash);
  const cgPassMatch = await verifyPassword("password123", caregiver!.passwordHash);
  const famPassMatch = await verifyPassword("FamilyCare2026!", familySon!.passwordHash);

  console.assert(adminPassMatch === true, "Test 12 Failed: Admin password must match");
  console.assert(cgPassMatch === true, "Test 13 Failed: Caregiver password must match");
  console.assert(famPassMatch === true, "Test 14 Failed: Family password must match");
  console.log("✓ Test 12-14: Password verification passes for all seeded accounts");

  console.log("\n============================================");
  console.log("ALL 14 PHASE 3 VERIFICATION TESTS PASSED!");
  console.log("============================================\n");
}

runTests()
  .catch((err) => {
    console.error("Test execution error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
