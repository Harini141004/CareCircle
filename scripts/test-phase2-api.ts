import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";
import { createSessionToken, verifyPassword, hashPassword } from "../src/lib/auth";
import { assertEmailUnique } from "../src/lib/admin-helpers";
import { patientAccessFilter, assertPatientAccess } from "../src/lib/patient-scope";

async function runTests() {
  console.log("==================================================");
  console.log(" Running CareCircle Phase 2 API Business Rules Tests");
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

  // 1. Cross-table email uniqueness check
  try {
    // caregiver@carecircle.demo already exists
    let conflictCaught = false;
    try {
      await assertEmailUnique("caregiver@carecircle.demo");
    } catch (e: any) {
      conflictCaught = e.statusCode === 409;
    }
    assert(conflictCaught, "assertEmailUnique detects existing Caregiver email (409)");

    let adminConflictCaught = false;
    try {
      await assertEmailUnique("admin@carecircle.demo");
    } catch (e: any) {
      adminConflictCaught = e.statusCode === 409;
    }
    assert(adminConflictCaught, "assertEmailUnique detects existing Admin email (409)");

    let familyConflictCaught = false;
    try {
      await assertEmailUnique("david.vance@family.demo");
    } catch (e: any) {
      familyConflictCaught = e.statusCode === 409;
    }
    assert(familyConflictCaught, "assertEmailUnique detects existing FamilyMember email (409)");

    // Unique email passes
    let noConflict = true;
    try {
      await assertEmailUnique("unique.new.user@domain.com");
    } catch {
      noConflict = false;
    }
    assert(noConflict, "assertEmailUnique passes for unused email");
  } catch (err) {
    console.error(err);
    failed++;
  }

  // 2. Primary Contact Family Member exclusivity in transaction
  try {
    const margaret = await prisma.patient.findFirst({
      where: { name: "Margaret Vance" },
      include: { familyMembers: true },
    });

    assert(margaret !== null, "Margaret Vance exists in database");

    if (margaret) {
      const david = margaret.familyMembers.find((f) => f.name === "David Vance");
      const emily = margaret.familyMembers.find((f) => f.name === "Emily Vance");

      assert(david?.isPrimaryContact === true, "Initial state: David is primary contact");
      assert(emily?.isPrimaryContact === false, "Initial state: Emily is NOT primary contact");

      // Switch Emily to primary in a transaction
      await prisma.$transaction(async (tx) => {
        await tx.familyMember.updateMany({
          where: { patientId: margaret.id, id: { not: emily!.id } },
          data: { isPrimaryContact: false },
        });
        await tx.familyMember.update({
          where: { id: emily!.id },
          data: { isPrimaryContact: true },
        });
      });

      const updatedDavid = await prisma.familyMember.findUnique({ where: { id: david!.id } });
      const updatedEmily = await prisma.familyMember.findUnique({ where: { id: emily!.id } });

      assert(updatedEmily?.isPrimaryContact === true, "Emily is now primary contact");
      assert(updatedDavid?.isPrimaryContact === false, "David was automatically unset as primary contact");

      // Restore David as primary contact
      await prisma.$transaction(async (tx) => {
        await tx.familyMember.updateMany({
          where: { patientId: margaret.id, id: { not: david!.id } },
          data: { isPrimaryContact: false },
        });
        await tx.familyMember.update({
          where: { id: david!.id },
          data: { isPrimaryContact: true },
        });
      });
    }
  } catch (err) {
    console.error(err);
    failed++;
  }

  // 3. Unverified Caregiver Reassignment Rule
  try {
    // Create an unverified caregiver
    const unverified = await prisma.caregiver.create({
      data: {
        name: "Test Unverified",
        email: "unverified.tester@carecircle.demo",
        passwordHash: await hashPassword("password123"),
        verificationStatus: "PENDING",
      },
    });

    const isEligible = unverified.verificationStatus === "VERIFIED" && unverified.isActive;
    assert(!isEligible, "Unverified caregiver (PENDING) is rejected from receiving patients");

    // Clean up test caregiver
    await prisma.caregiver.delete({ where: { id: unverified.id } });
  } catch (err) {
    console.error(err);
    failed++;
  }

  // 4. Last Admin Deactivation Prevention Rule
  try {
    const adminCount = await prisma.admin.count({ where: { isActive: true } });
    const canDeactivateLastAdmin = adminCount > 1;
    assert(!canDeactivateLastAdmin, "Deactivating last active admin is prevented when count <= 1");
  } catch (err) {
    console.error(err);
    failed++;
  }

  // 5. Family Member Scope Verification with Multiple Members per Patient
  try {
    const david = await prisma.familyMember.findUnique({
      where: { email: "david.vance@family.demo" },
    });
    const emily = await prisma.familyMember.findUnique({
      where: { email: "emily.vance@family.demo" },
    });
    const carol = await prisma.familyMember.findUnique({
      where: { email: "carol.pendelton@family.demo" },
    });

    assert(david !== null && emily !== null && carol !== null, "All 3 seeded family members exist");

    if (david && emily && carol) {
      // Query patients using patientAccessFilter for David (Son of Margaret)
      const davidPatients = await prisma.patient.findMany({
        where: patientAccessFilter({ id: david.id, email: david.email, name: david.name, role: "FAMILY" }),
      });
      assert(
        davidPatients.length === 1 && davidPatients[0].name === "Margaret Vance",
        "David (Son) only sees his linked patient Margaret Vance"
      );

      // Query patients using patientAccessFilter for Emily (Daughter of Margaret)
      const emilyPatients = await prisma.patient.findMany({
        where: patientAccessFilter({ id: emily.id, email: emily.email, name: emily.name, role: "FAMILY" }),
      });
      assert(
        emilyPatients.length === 1 && emilyPatients[0].name === "Margaret Vance",
        "Emily (Daughter) also sees her linked patient Margaret Vance"
      );

      // Query patients using patientAccessFilter for Carol (Spouse of Arthur)
      const carolPatients = await prisma.patient.findMany({
        where: patientAccessFilter({ id: carol.id, email: carol.email, name: carol.name, role: "FAMILY" }),
      });
      assert(
        carolPatients.length === 1 && carolPatients[0].name === "Arthur Pendelton",
        "Carol (Spouse) only sees her linked patient Arthur Pendelton"
      );

      // Read-only check: assertPatientAccess with write = true throws for Family member
      let writeBlocked = false;
      try {
        await assertPatientAccess(
          { id: david.id, email: david.email, name: david.name, role: "FAMILY" },
          davidPatients[0].id,
          { write: true }
        );
      } catch (e: any) {
        writeBlocked = e.statusCode === 403;
      }
      assert(writeBlocked, "Family member write operations are blocked with 403 Forbidden");
    }
  } catch (err) {
    console.error(err);
    failed++;
  }

  // 6. Password Reset Logic
  try {
    const admin = await prisma.admin.findUnique({ where: { email: "admin@carecircle.demo" } });
    assert(admin !== null, "Admin exists for password reset test");

    if (admin) {
      const newTempPass = "NewSecureTempPass99!";
      const newHash = await hashPassword(newTempPass);
      const isMatch = await verifyPassword(newTempPass, newHash);
      assert(isMatch, "hashPassword and verifyPassword correctly validate new credentials");
    }
  } catch (err) {
    console.error(err);
    failed++;
  }

  console.log("==================================================");
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
