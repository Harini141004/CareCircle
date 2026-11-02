-- CreateTable
CREATE TABLE "DoseLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "scheduledFor" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "takenAt" DATETIME,
    "note" TEXT,
    "reason" TEXT,
    "loggedByType" TEXT,
    "loggedById" TEXT,
    "loggedAt" DATETIME,
    "editedAt" DATETIME,
    "editedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DoseLog_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DoseLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Medication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "timesOfDay" TEXT NOT NULL,
    "instructions" TEXT,
    "prescribingDoctor" TEXT,
    "totalQuantity" INTEGER NOT NULL DEFAULT 30,
    "remainingQuantity" INTEGER NOT NULL DEFAULT 30,
    "refillThreshold" INTEGER NOT NULL DEFAULT 7,
    "nextRefillDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Medication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Medication" ("createdAt", "dosage", "frequency", "id", "instructions", "isActive", "name", "nextRefillDate", "patientId", "prescribingDoctor", "refillThreshold", "remainingQuantity", "timesOfDay", "totalQuantity", "updatedAt") SELECT "createdAt", "dosage", "frequency", "id", "instructions", "isActive", "name", "nextRefillDate", "patientId", "prescribingDoctor", "refillThreshold", "remainingQuantity", "timesOfDay", "totalQuantity", "updatedAt" FROM "Medication";
DROP TABLE "Medication";
ALTER TABLE "new_Medication" RENAME TO "Medication";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DoseLog_patientId_scheduledFor_idx" ON "DoseLog"("patientId", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "DoseLog_medicationId_scheduledFor_key" ON "DoseLog"("medicationId", "scheduledFor");
