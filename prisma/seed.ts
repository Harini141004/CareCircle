import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding CareCircle database...");

  // Clean existing records in referential integrity order
  await (prisma as any).message?.deleteMany();
  await (prisma as any).conversation?.deleteMany();
  await (prisma as any).careNote?.deleteMany();
  await (prisma as any).auditLog?.deleteMany();
  await (prisma as any).loginAttempt?.deleteMany();
  await (prisma as any).systemSetting?.deleteMany();
  await (prisma as any).notificationPreference?.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.symptomLog.deleteMany();
  await prisma.medicationLog.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.caregiver.deleteMany();
  await prisma.admin.deleteMany();

  // Distinct passwords for each role (never reused in production)
  const adminPasswordHash = await bcrypt.hash("AdminSecret2026!", 10);
  const caregiverPasswordHash = await bcrypt.hash("password123", 10);
  const familyPasswordHash = await bcrypt.hash("FamilyCare2026!", 10);

  // 1. Create Admin (1 admin)
  const admin = await prisma.admin.create({
    data: {
      email: "admin@carecircle.demo",
      name: "Harini",
      passwordHash: adminPasswordHash,
      phone: "+1 (555) 010-9999",
      isActive: true,
    },
  });
  console.log(`Created Admin: ${admin.email}`);

  // 2. Create Caregiver 1: Sarah Vance (2 caregivers total)
  const caregiver1 = await prisma.caregiver.create({
    data: {
      email: "caregiver@carecircle.demo",
      name: "Sarah Vance",
      passwordHash: caregiverPasswordHash,
      phone: "+1 (555) 019-2831",
      education: "BSN, Registered Nurse",
      previousExperience: "8 years in geriatric & palliative care",
      verificationStatus: "VERIFIED",
      isActive: true,
    },
  });
  await (prisma as any).notificationPreference.create({
    data: {
      userType: "CARETAKER",
      userId: caregiver1.id,
      emailAlerts: true,
      inAppAlerts: true,
      notifyMissedMed: true,
      notifyRefillDue: true,
      notifyVitalsWarning: true,
      notifyAppointment: true,
    },
  });
  console.log(`Created Caregiver 1: ${caregiver1.email}`);

  // 3. Create Caregiver 2: Marcus Miller
  const caregiver2 = await prisma.caregiver.create({
    data: {
      email: "marcus.care@carecircle.demo",
      name: "Marcus Miller",
      passwordHash: caregiverPasswordHash,
      phone: "+1 (555) 014-4321",
      education: "Certified Nursing Assistant (CNA)",
      previousExperience: "5 years in home health and rehabilitation",
      verificationStatus: "VERIFIED",
      isActive: true,
    },
  });
  await (prisma as any).notificationPreference.create({
    data: {
      userType: "CARETAKER",
      userId: caregiver2.id,
      emailAlerts: true,
      inAppAlerts: true,
      notifyMissedMed: true,
      notifyRefillDue: true,
      notifyVitalsWarning: true,
      notifyAppointment: true,
    },
  });
  console.log(`Created Caregiver 2: ${caregiver2.email}`);

  // 4. Create Patient 1 (under Sarah): Margaret Vance (3 patients total)
  const margaret = await prisma.patient.create({
    data: {
      caregiverId: caregiver1.id,
      name: "Margaret Vance",
      dob: new Date("1948-03-12"),
      gender: "Female",
      relationship: "Mother", // Relation to caregiver
      primaryCondition: "Hypertension, Type 2 Diabetes",
      bloodType: "O+",
      allergies: "Penicillin, Sulfa drugs",
      emergencyContact: "David Vance (Son) - (555) 018-7711",
      notes: "Requires help reading small pill bottle labels. Prefers morning appointments.",
      avatarColor: "#0D9488",
      isActive: true,
    },
  });

  // Family Members for Margaret Vance (2 family members: Son and Daughter)
  const david = await prisma.familyMember.create({
    data: {
      patientId: margaret.id,
      email: "david.vance@family.demo",
      passwordHash: familyPasswordHash,
      name: "David Vance",
      phone: "+1 (555) 018-7711",
      relationship: "SON",
      isPrimaryContact: true,
      isActive: true,
    },
  });
  console.log(`Created Family Member 1 (Son): ${david.email} linked to ${margaret.name}`);

  const emily = await prisma.familyMember.create({
    data: {
      patientId: margaret.id,
      email: "emily.vance@family.demo",
      passwordHash: familyPasswordHash,
      name: "Emily Vance",
      phone: "+1 (555) 018-7722",
      relationship: "DAUGHTER",
      isPrimaryContact: false,
      isActive: true,
    },
  });
  console.log(`Created Family Member 2 (Daughter): ${emily.email} linked to ${margaret.name}`);

  // Medications for Margaret
  const lisinopril = await prisma.medication.create({
    data: {
      patientId: margaret.id,
      name: "Lisinopril",
      dosage: "10mg",
      frequency: "Once Daily",
      timesOfDay: JSON.stringify(["08:00"]),
      instructions: "Take morning with food and full glass of water",
      prescribingDoctor: "Dr. Robert Vance",
      totalQuantity: 30,
      remainingQuantity: 24,
      refillThreshold: 7,
      nextRefillDate: new Date(Date.now() + 20 * 86400000),
    },
  });

  const metformin = await prisma.medication.create({
    data: {
      patientId: margaret.id,
      name: "Metformin",
      dosage: "500mg",
      frequency: "Twice Daily",
      timesOfDay: JSON.stringify(["08:00", "19:00"]),
      instructions: "Take with meals to reduce stomach upset",
      prescribingDoctor: "Dr. Robert Vance",
      totalQuantity: 60,
      remainingQuantity: 5, // LOW REFILL ALERT!
      refillThreshold: 10,
      nextRefillDate: new Date(Date.now() + 2 * 86400000),
    },
  });

  // Past Medication Logs for Margaret
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const logDate = new Date(now.getTime() - i * 86400000);
    logDate.setHours(8, 0, 0, 0);

    await prisma.medicationLog.create({
      data: {
        medicationId: lisinopril.id,
        patientId: margaret.id,
        scheduledFor: logDate,
        status: i === 2 ? "MISSED" : "TAKEN",
        takenAt: i === 2 ? null : new Date(logDate.getTime() + 15 * 60000),
        notes: i === 2 ? "Fell asleep early, forgot morning dose" : "Taken on time",
      },
    });

    await prisma.medicationLog.create({
      data: {
        medicationId: metformin.id,
        patientId: margaret.id,
        scheduledFor: logDate,
        status: "TAKEN",
        takenAt: new Date(logDate.getTime() + 20 * 60000),
      },
    });
  }

  // Symptom Logs for Margaret
  const bpReadings = [
    { sys: 138, dia: 86, sugar: 142, hr: 74, sev: 3, mood: "Good", notes: "Slight headache after lunch" },
    { sys: 142, dia: 88, sugar: 158, hr: 76, sev: 4, mood: "Fatigued", notes: "Felt sluggish in morning" },
    { sys: 135, dia: 84, sugar: 130, hr: 72, sev: 2, mood: "Great", notes: "30 min neighborhood walk" },
    { sys: 140, dia: 85, sugar: 165, hr: 78, sev: 4, mood: "Anxious", notes: "Blood sugar higher after dessert" },
    { sys: 136, dia: 82, sugar: 135, hr: 71, sev: 2, mood: "Good", notes: "Normal day" },
    { sys: 144, dia: 90, sugar: 172, hr: 80, sev: 5, mood: "Dizzy", notes: "Felt mild dizziness when standing up" },
    { sys: 132, dia: 80, sugar: 128, hr: 70, sev: 1, mood: "Excellent", notes: "Felt great all day" },
  ];

  for (let i = 0; i < bpReadings.length; i++) {
    const item = bpReadings[i];
    const logDate = new Date(now.getTime() - (6 - i) * 86400000);
    await prisma.symptomLog.create({
      data: {
        patientId: margaret.id,
        timestamp: logDate,
        bloodPressureSystolic: item.sys,
        bloodPressureDiastolic: item.dia,
        bloodSugar: item.sugar,
        heartRate: item.hr,
        symptomSeverity: item.sev,
        mood: item.mood,
        notes: item.notes,
        weight: 68.5,
        temperature: 98.6,
      },
    });
  }

  // Appointment for Margaret
  await prisma.appointment.create({
    data: {
      patientId: margaret.id,
      doctorName: "Dr. Robert Vance, MD",
      specialty: "Cardiology & Primary Care",
      location: "St. Jude Medical Center, Suite 400",
      dateTime: new Date(now.getTime() + 3 * 86400000),
      reason: "Quarterly Blood Pressure & Diabetes Follow-up",
      notes: "Review vitals and evaluate Metformin dosage.",
      status: "UPCOMING",
      checklistItems: {
        create: [
          { task: "Bring printed 14-day vitals log", isCompleted: true },
          { task: "Request prescription refill for Metformin 500mg", isCompleted: false },
        ],
      },
    },
  });

  // 5. Create Patient 2 (under Sarah): Leo Vance
  const leo = await prisma.patient.create({
    data: {
      caregiverId: caregiver1.id,
      name: "Leo Vance",
      dob: new Date("1982-08-25"),
      gender: "Male",
      relationship: "Brother",
      primaryCondition: "Chronic Asthma",
      bloodType: "A+",
      allergies: "Dust Mites, Shellfish",
      emergencyContact: "Sarah Vance (Sister) - (555) 019-2831",
      notes: "Has prescription inhaler spacer.",
      avatarColor: "#6366F1",
      isActive: true,
    },
  });

  // Medication for Leo
  await prisma.medication.create({
    data: {
      patientId: leo.id,
      name: "Albuterol Rescue Inhaler",
      dosage: "90mcg / puff",
      frequency: "As Needed",
      timesOfDay: JSON.stringify(["12:00"]),
      instructions: "1-2 inhalations as needed for shortness of breath",
      prescribingDoctor: "Dr. Elena Rostova",
      totalQuantity: 200,
      remainingQuantity: 175,
      refillThreshold: 30,
    },
  });

  // 6. Create Patient 3 (under Marcus Miller): Arthur Pendelton
  const arthur = await prisma.patient.create({
    data: {
      caregiverId: caregiver2.id,
      name: "Arthur Pendelton",
      dob: new Date("1942-11-04"),
      gender: "Male",
      relationship: "Client",
      primaryCondition: "Osteoarthritis, Mild Cognitive Impairment",
      bloodType: "B+",
      allergies: "Aspirin, Codeine",
      emergencyContact: "Carol Pendelton (Spouse) - (555) 012-8877",
      notes: "Enjoys morning crossword puzzles. Needs assistance with balance.",
      avatarColor: "#F59E0B",
      isActive: true,
    },
  });

  // Family Member for Arthur Pendelton (Spouse)
  const carol = await prisma.familyMember.create({
    data: {
      patientId: arthur.id,
      email: "carol.pendelton@family.demo",
      passwordHash: familyPasswordHash,
      name: "Carol Pendelton",
      phone: "+1 (555) 012-8877",
      relationship: "SPOUSE",
      isPrimaryContact: true,
      isActive: true,
    },
  });
  console.log(`Created Family Member 3 (Spouse): ${carol.email} linked to ${arthur.name}`);

  // Medication for Arthur
  await prisma.medication.create({
    data: {
      patientId: arthur.id,
      name: "Glucosamine Chondroitin",
      dosage: "1500mg",
      frequency: "Once Daily",
      timesOfDay: JSON.stringify(["09:00"]),
      instructions: "Take with morning meal",
      prescribingDoctor: "Dr. Henry Wu",
      totalQuantity: 60,
      remainingQuantity: 48,
      refillThreshold: 14,
    },
  });

  // 7. Initial Alerts
  await prisma.alert.createMany({
    data: [
      {
        caregiverId: caregiver1.id,
        patientId: margaret.id,
        type: "REFILL_DUE",
        title: "Refill Urgently Needed",
        message: "Metformin 500mg for Margaret Vance is down to 5 pills. Refill required within 2 days.",
        severity: "danger",
        isRead: false,
      },
      {
        caregiverId: caregiver1.id,
        patientId: margaret.id,
        type: "UPCOMING_APPOINTMENT",
        title: "Doctor Visit in 3 Days",
        message: "Cardiology follow-up with Dr. Robert Vance scheduled for Margaret Vance.",
        severity: "info",
        isRead: false,
      },
      {
        caregiverId: caregiver2.id,
        patientId: arthur.id,
        type: "VITALS_WARNING",
        title: "Mild Mobility Assistance Required",
        message: "Arthur Pendelton physical therapy scheduled for next Tuesday.",
        severity: "info",
        isRead: false,
      },
    ],
  });

  // 8. Default System Settings
  await (prisma as any).systemSetting.createMany({
    data: [
      { key: "overdueDoseMinutes", value: JSON.stringify(60) },
      { key: "refillWarningDays", value: JSON.stringify(7) },
      { key: "alertEscalationHours", value: JSON.stringify(24) },
      { key: "alertRecipientEmails", value: JSON.stringify(["admin@carecircle.demo"]) },
    ],
  });

  console.log("Database seeded successfully with 1 Admin, 2 Caregivers, 3 Patients, 3 Family Members, and System Settings!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
