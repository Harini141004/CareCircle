import { getSessionUser, homePathForRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ensureDosesForDate } from "@/lib/dose-marking";
import FamilyProfileClient from "./FamilyProfileClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Family Member Profile — CareCircle",
  description: "Scoped view of your loved one's health records and care coordination.",
};

export default async function FamilyProfilePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "FAMILY") {
    redirect(homePathForRole(user.role));
  }

  const familyMember = await prisma.familyMember.findUnique({
    where: { id: user.id },
    include: {
      patient: {
        include: {
          caregiver: {
            select: { id: true, name: true, email: true, phone: true, education: true, verificationStatus: true },
          },
          medications: {
            where: { isActive: true },
          },
          appointments: {
            orderBy: { dateTime: "asc" },
            take: 5,
          },
          symptomLogs: {
            orderBy: { timestamp: "desc" },
            take: 5,
          },
        },
      },
    },
  });

  if (!familyMember) {
    redirect("/login");
  }

  // Calculate peace-of-mind metrics if patient exists
  let peaceOfMind = {
    lastCheckIn: "No activity recorded yet",
    todayAdherence: "100%",
    adherenceSubtitle: "All medications up to date",
    nextEvent: "No upcoming appointments",
    caregiverOnDuty: familyMember.patient?.caregiver?.name || "Unassigned",
    caregiverPhone: familyMember.patient?.caregiver?.phone || null,
  };

  if (familyMember.patient) {
    const patientId = familyMember.patient.id;

    // 1. Last check-in
    const [lastDose, lastNote] = await Promise.all([
      prisma.medicationLog.findFirst({
        where: { patientId, status: "TAKEN" },
        orderBy: { takenAt: "desc" },
      }),
      prisma.careNote.findFirst({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const timestamps: Date[] = [];
    if (lastDose?.takenAt) timestamps.push(new Date(lastDose.takenAt));
    if (lastNote?.createdAt) timestamps.push(new Date(lastNote.createdAt));
    if (familyMember.patient.symptomLogs.length > 0) {
      timestamps.push(new Date(familyMember.patient.symptomLogs[0].timestamp));
    }

    if (timestamps.length > 0) {
      timestamps.sort((a, b) => b.getTime() - a.getTime());
      const latest = timestamps[0];
      const isToday = latest.toDateString() === new Date().toDateString();
      peaceOfMind.lastCheckIn = isToday
        ? `Today at ${latest.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
        : latest.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    }

    // 2. Today's Adherence & Dose Overview
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    await ensureDosesForDate(patientId);

    const todayDoses = await prisma.doseLog.findMany({
      where: {
        patientId,
        scheduledFor: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        medication: true,
      },
      orderBy: { scheduledFor: "asc" },
    });

    if (todayDoses.length > 0) {
      const taken = todayDoses.filter((d) => d.status === "TAKEN" || d.status === "TAKEN_LATE").length;
      peaceOfMind.todayAdherence = `${taken} of ${todayDoses.length} doses taken today`;

      const problemDoses = todayDoses.filter((d) => d.status === "MISSED" || d.status === "REFUSED");
      if (problemDoses.length > 0) {
        const issues = problemDoses
          .map((d) => `${d.status === "REFUSED" ? "Refused" : "Missed"} ${d.medication.name}${d.reason ? ` (${d.reason})` : ""}`)
          .join("; ");
        peaceOfMind.adherenceSubtitle = `Alert: ${issues}`;
      } else {
        const pending = todayDoses.filter((d) => d.status === "PENDING").length;
        peaceOfMind.adherenceSubtitle = pending > 0 ? `${pending} dose(s) pending later today` : "All scheduled doses taken";
      }
    } else {
      peaceOfMind.todayAdherence = "0 of 0 doses today";
      peaceOfMind.adherenceSubtitle = "No medications scheduled today";
    }

    // 3. Next Scheduled Event
    const nextAppointment = await prisma.appointment.findFirst({
      where: {
        patientId,
        dateTime: { gte: new Date() },
      },
      orderBy: { dateTime: "asc" },
    });

    if (nextAppointment) {
      const aptDate = new Date(nextAppointment.dateTime);
      const isTomorrow =
        aptDate.getDate() === new Date().getDate() + 1 &&
        aptDate.getMonth() === new Date().getMonth();
      const isToday = aptDate.toDateString() === new Date().toDateString();
      const dayStr = isToday ? "Today" : isTomorrow ? "Tomorrow" : aptDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      peaceOfMind.nextEvent = `${nextAppointment.doctorName} (${dayStr}, ${aptDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })})`;
    }
  }

  return <FamilyProfileClient familyMember={familyMember} peaceOfMind={peaceOfMind} />;
}
