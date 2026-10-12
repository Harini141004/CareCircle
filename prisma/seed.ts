import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  // Clean existing records
  await prisma.alert.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.symptomLog.deleteMany();
  await prisma.medicationLog.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.caregiver.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Caregiver
  const caregiver = await prisma.caregiver.create({
    data: {
      email: "caregiver@carecircle.demo",
      name: "Sarah Vance",
      passwordHash,
    },
  });

  console.log(`Created Caregiver: ${caregiver.email}`);

  // 2. Create Patient 1: Margaret Vance (Mother)
  const margaret = await prisma.patient.create({
    data: {
      caregiverId: caregiver.id,
      name: "Margaret Vance",
      dob: new Date("1948-03-12"),
      gender: "Female",
      relationship: "Mother",
      primaryCondition: "Hypertension, Type 2 Diabetes",
      bloodType: "O+",
      allergies: "Penicillin, Sulfa drugs",
      emergencyContact: "Sarah Vance (Daughter) - (555) 019-2831",
      notes: "Requires help reading small pill bottle labels. Prefers morning appointments.",
      avatarColor: "#0D9488",
    },
  });

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

  const amlodipine = await prisma.medication.create({
    data: {
      patientId: margaret.id,
      name: "Amlodipine Besylate",
      dosage: "5mg",
      frequency: "Once Daily",
      timesOfDay: JSON.stringify(["20:00"]),
      instructions: "Take at bedtime",
      prescribingDoctor: "Dr. Robert Vance",
      totalQuantity: 30,
      remainingQuantity: 22,
      refillThreshold: 7,
      nextRefillDate: new Date(Date.now() + 18 * 86400000),
    },
  });

  // Past Medication Logs for Margaret (Past 7 days)
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const logDate = new Date(now.getTime() - i * 86400000);
    logDate.setHours(8, 0, 0, 0);

    // Lisinopril
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

    // Metformin Morning
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

  // Symptom & Vitals Logs for Margaret (Past 14 days)
  const bpReadings = [
    { sys: 138, dia: 86, sugar: 142, hr: 74, sev: 3, mood: "Good", notes: "Slight headache after lunch" },
    { sys: 142, dia: 88, sugar: 158, hr: 76, sev: 4, mood: "Fatigued", notes: "Felt sluggish in morning" },
    { sys: 135, dia: 84, sugar: 130, hr: 72, sev: 2, mood: "Great", notes: "30 min neighborhood walk" },
    { sys: 140, dia: 85, sugar: 165, hr: 78, sev: 4, mood: "Anxious", notes: "Blood sugar higher after dessert" },
    { sys: 136, dia: 82, sugar: 135, hr: 71, sev: 2, mood: "Good", notes: "Normal day" },
    { sys: 144, dia: 90, sugar: 172, hr: 80, sev: 5, mood: "Dizzy", notes: "Felt mild dizziness when standing up" },
    { sys: 132, dia: 80, sugar: 128, hr: 70, sev: 1, mood: "Excellent", notes: "Felt great all day" },
    { sys: 139, dia: 85, sugar: 148, hr: 75, sev: 3, mood: "Good", notes: "Routine check" },
    { sys: 141, dia: 87, sugar: 152, hr: 77, sev: 3, mood: "Fair", notes: "Warm weather" },
    { sys: 134, dia: 82, sugar: 132, hr: 73, sev: 2, mood: "Good", notes: "Good appetite" },
    { sys: 137, dia: 84, sugar: 140, hr: 72, sev: 2, mood: "Good", notes: "Took evening walk" },
    { sys: 143, dia: 89, sugar: 168, hr: 79, sev: 4, mood: "Tired", notes: "Trouble sleeping" },
    { sys: 135, dia: 83, sugar: 138, hr: 74, sev: 2, mood: "Good", notes: "Balanced diet day" },
    { sys: 138, dia: 85, sugar: 145, hr: 75, sev: 3, mood: "Good", notes: "Today's morning reading" },
  ];

  for (let i = 0; i < bpReadings.length; i++) {
    const item = bpReadings[i];
    const logDate = new Date(now.getTime() - (13 - i) * 86400000);
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
        weight: 68.5 + (i % 3) * 0.2,
        temperature: 98.6,
      },
    });
  }

  // Appointment for Margaret
  const appt1 = await prisma.appointment.create({
    data: {
      patientId: margaret.id,
      doctorName: "Dr. Robert Vance, MD",
      specialty: "Cardiology & Primary Care",
      location: "St. Jude Medical Center, Suite 400",
      dateTime: new Date(now.getTime() + 3 * 86400000 + 2 * 3600000), // 3 days from now 10:00 AM
      reason: "Quarterly Blood Pressure & Diabetes Follow-up",
      notes: "Need to review 14-day vitals log and discuss Metformin dose.",
      status: "UPCOMING",
      checklistItems: {
        create: [
          { task: "Bring 14-day blood pressure & sugar log printed summary", isCompleted: true },
          { task: "Ask Dr. Vance about morning dizziness episode on day 6", isCompleted: false },
          { task: "Request prescription refill for Metformin 500mg", isCompleted: false },
          { task: "Confirm next lab work date for HbA1c test", isCompleted: false },
        ],
      },
    },
  });

  // 3. Create Patient 2: Leo Vance (Brother)
  const leo = await prisma.patient.create({
    data: {
      caregiverId: caregiver.id,
      name: "Leo Vance",
      dob: new Date("1982-08-25"),
      gender: "Male",
      relationship: "Brother",
      primaryCondition: "Chronic Asthma, Generalized Anxiety",
      bloodType: "A+",
      allergies: "Dust Mites, Latex, Shellfish",
      emergencyContact: "Sarah Vance (Sister) - (555) 019-2831",
      notes: "Has prescription inhaler spacer. Monitors peak flow twice weekly.",
      avatarColor: "#6366F1",
    },
  });

  const advair = await prisma.medication.create({
    data: {
      patientId: leo.id,
      name: "Advair Diskus (Fluticasone/Salmeterol)",
      dosage: "250/50 mcg",
      frequency: "Twice Daily",
      timesOfDay: JSON.stringify(["08:00", "20:00"]),
      instructions: "Rinse mouth thoroughly with water after inhalation",
      prescribingDoctor: "Dr. Elena Rostova",
      totalQuantity: 60,
      remainingQuantity: 42,
      refillThreshold: 10,
      nextRefillDate: new Date(Date.now() + 21 * 86400000),
    },
  });

  const albuterol = await prisma.medication.create({
    data: {
      patientId: leo.id,
      name: "Albuterol Rescue Inhaler",
      dosage: "90mcg / puff",
      frequency: "As Needed",
      timesOfDay: JSON.stringify(["12:00"]),
      instructions: "1-2 inhalations every 4-6 hours as needed for shortness of breath",
      prescribingDoctor: "Dr. Elena Rostova",
      totalQuantity: 200,
      remainingQuantity: 175,
      refillThreshold: 30,
      nextRefillDate: new Date(Date.now() + 60 * 86400000),
    },
  });

  const sertraline = await prisma.medication.create({
    data: {
      patientId: leo.id,
      name: "Sertraline",
      dosage: "50mg",
      frequency: "Once Daily",
      timesOfDay: JSON.stringify(["09:00"]),
      instructions: "Take in morning with breakfast",
      prescribingDoctor: "Dr. Marcus Thorne",
      totalQuantity: 30,
      remainingQuantity: 18,
      refillThreshold: 7,
      nextRefillDate: new Date(Date.now() + 14 * 86400000),
    },
  });

  // Past Medication Logs for Leo (Past 7 days)
  for (let i = 6; i >= 0; i--) {
    const logDate = new Date(now.getTime() - i * 86400000);
    logDate.setHours(8, 0, 0, 0);

    await prisma.medicationLog.create({
      data: {
        medicationId: advair.id,
        patientId: leo.id,
        scheduledFor: logDate,
        status: i === 1 ? "MISSED" : "TAKEN",
        takenAt: i === 1 ? null : new Date(logDate.getTime() + 10 * 60000),
        notes: i === 1 ? "Missed evening dose due to work travel" : "Dose taken",
      },
    });

    await prisma.medicationLog.create({
      data: {
        medicationId: sertraline.id,
        patientId: leo.id,
        scheduledFor: logDate,
        status: "TAKEN",
        takenAt: new Date(logDate.getTime() + 45 * 60000),
      },
    });
  }

  // Symptom Logs for Leo (Past 10 days)
  const leoLogs = [
    { hr: 72, temp: 98.4, weight: 75.2, mood: "Calm", sev: 2, notes: "Peak flow 480 L/min. Breathing normal." },
    { hr: 82, temp: 98.6, weight: 75.0, mood: "Anxious", sev: 5, notes: "Mild wheezing after pollen exposure. Used rescue inhaler 1 puff." },
    { hr: 74, temp: 98.2, weight: 75.3, mood: "Good", sev: 2, notes: "Felt relaxed. Peak flow 490 L/min." },
    { hr: 78, temp: 98.6, weight: 75.1, mood: "Fair", sev: 3, notes: "Slight tightness in chest in evening." },
    { hr: 71, temp: 98.5, weight: 75.4, mood: "Good", sev: 1, notes: "No symptoms reported." },
    { hr: 85, temp: 98.7, weight: 75.2, mood: "Anxious", sev: 6, notes: "Stressful workday, heart rate elevated, breathing shallow." },
    { hr: 73, temp: 98.4, weight: 75.5, mood: "Calm", sev: 2, notes: "Good sleep, peak flow 500 L/min." },
    { hr: 76, temp: 98.6, weight: 75.3, mood: "Good", sev: 2, notes: "Morning walk completed smoothly." },
    { hr: 75, temp: 98.5, weight: 75.2, mood: "Good", sev: 2, notes: "Stable day." },
    { hr: 72, temp: 98.6, weight: 75.3, mood: "Calm", sev: 1, notes: "Today's log." },
  ];

  for (let i = 0; i < leoLogs.length; i++) {
    const item = leoLogs[i];
    const logDate = new Date(now.getTime() - (9 - i) * 86400000);
    await prisma.symptomLog.create({
      data: {
        patientId: leo.id,
        timestamp: logDate,
        heartRate: item.hr,
        temperature: item.temp,
        weight: item.weight,
        mood: item.mood,
        symptomSeverity: item.sev,
        notes: item.notes,
        bloodPressureSystolic: 122 + (i % 2) * 2,
        bloodPressureDiastolic: 78 + (i % 2),
      },
    });
  }

  // Appointment for Leo
  await prisma.appointment.create({
    data: {
      patientId: leo.id,
      doctorName: "Dr. Elena Rostova",
      specialty: "Pulmonology & Respiratory Care",
      location: "City Health Clinic, Room 210",
      dateTime: new Date(now.getTime() + 7 * 86400000 + 4 * 3600000), // 7 days from now
      reason: "Annual Asthma Action Plan & Allergy Review",
      notes: "Evaluate peak flow trends and review Advair dosage.",
      status: "UPCOMING",
      checklistItems: {
        create: [
          { task: "Bring peak flow log journal", isCompleted: true },
          { task: "Check expiration date on rescue inhaler spare", isCompleted: false },
          { task: "Ask doctor about new allergy immunotherapy options", isCompleted: false },
        ],
      },
    },
  });

  // 4. Pre-populated Cross-Patient Alerts
  await prisma.alert.createMany({
    data: [
      {
        caregiverId: caregiver.id,
        patientId: margaret.id,
        type: "REFILL_DUE",
        title: "Refill Urgently Needed",
        message: "Metformin 500mg for Margaret Vance is down to 5 pills. Refill required within 2 days.",
        severity: "danger",
        isRead: false,
      },
      {
        caregiverId: caregiver.id,
        patientId: margaret.id,
        type: "UPCOMING_APPOINTMENT",
        title: "Doctor Visit in 3 Days",
        message: "Cardiology follow-up with Dr. Robert Vance scheduled for Margaret Vance.",
        severity: "info",
        isRead: false,
      },
      {
        caregiverId: caregiver.id,
        patientId: leo.id,
        type: "MISSED_MED",
        title: "Missed Medication Recorded",
        message: "Advair Diskus dose for Leo Vance was marked as missed yesterday evening.",
        severity: "warning",
        isRead: false,
      },
    ],
  });

  console.log("Database seeded successfully with demo Caregiver and 2 Patients!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
