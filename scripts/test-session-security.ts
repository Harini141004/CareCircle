/**
 * Unit test / verification script for session security.
 * Proves that:
 * 1. Forged base64 cookies ("role:id") return null.
 * 2. Legacy no-colon base64 cookies return null.
 * 3. Tampered JWTs return null.
 * 4. JWTs signed with the wrong secret return null.
 * 5. Expired JWTs return null.
 * 6. Valid signed JWTs verify successfully.
 * 7. SESSION_SECRET < 32 chars or missing throws a clear error.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { SignJWT } from "jose";
import {
  createSessionToken,
  verifySessionToken,
  getSessionSecretKey,
} from "../src/lib/auth";

async function runTests() {
  console.log("==================================================");
  console.log(" Running CareCircle Session Security Unit Tests");
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

  // 1. Forged base64 cookie with role:id
  const forgedBase64Admin = Buffer.from("ADMIN:fake-admin-id-1234").toString("base64");
  const res1 = await verifySessionToken(forgedBase64Admin);
  assert(res1 === null, "Forged base64 'ADMIN:id' cookie returns null");

  // 2. Legacy base64 cookie with no colon
  const legacyNoColon = Buffer.from("fake-caregiver-id-5678").toString("base64");
  const res2 = await verifySessionToken(legacyNoColon);
  assert(res2 === null, "Legacy base64 cookie with no colon returns null");

  // 3. Valid JWT creation & verification
  const validToken = await createSessionToken("user-real-uuid-001", "ADMIN");
  const res3 = await verifySessionToken(validToken);
  assert(
    res3 !== null && res3.sub === "user-real-uuid-001" && res3.role === "ADMIN",
    "Valid JWT signed with SESSION_SECRET verifies correctly ({ sub, role })"
  );

  // 4. Tampered JWT signature
  // Modify the signature portion of the valid JWT
  const tokenParts = validToken.split(".");
  const tamperedSig = tokenParts[2].slice(0, -3) + "xyz";
  const tamperedToken = `${tokenParts[0]}.${tokenParts[1]}.${tamperedSig}`;
  const res4 = await verifySessionToken(tamperedToken);
  assert(res4 === null, "Tampered JWT with modified signature returns null");

  // 5. Tampered payload with valid-looking signature
  const forgedPayload = Buffer.from(JSON.stringify({ sub: "hacked-admin", role: "ADMIN" })).toString("base64url");
  const tamperedPayloadToken = `${tokenParts[0]}.${forgedPayload}.${tokenParts[2]}`;
  const res5 = await verifySessionToken(tamperedPayloadToken);
  assert(res5 === null, "Tampered JWT with modified payload returns null");

  // 6. Token signed with wrong secret
  const wrongSecret = new TextEncoder().encode("wrong-secret-key-that-is-at-least-32-chars-long!!");
  const tokenWithWrongSecret = await new SignJWT({ role: "ADMIN" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("attacker-admin-id")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(wrongSecret);
  const res6 = await verifySessionToken(tokenWithWrongSecret);
  assert(res6 === null, "JWT signed with wrong secret returns null");

  // 7. Expired token
  const expiredSecretKey = getSessionSecretKey();
  const expiredToken = await new SignJWT({ role: "CARETAKER" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("user-expired-001")
    .setIssuedAt(Math.floor(Date.now() / 1000) - 1000)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 10) // expired 10 seconds ago
    .sign(expiredSecretKey);
  const res7 = await verifySessionToken(expiredToken);
  assert(res7 === null, "Expired JWT returns null");

  // 8. Secret validation requirement (< 32 characters or missing)
  const originalSecret = process.env.SESSION_SECRET;
  try {
    process.env.SESSION_SECRET = "short-secret";
    let threwError = false;
    try {
      getSessionSecretKey();
    } catch (e: any) {
      threwError = e.message.includes("SESSION_SECRET is missing or shorter than 32 characters");
    }
    assert(threwError, "Throws clear error when SESSION_SECRET is shorter than 32 characters");
  } finally {
    process.env.SESSION_SECRET = originalSecret;
  }

  console.log("==================================================");
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
