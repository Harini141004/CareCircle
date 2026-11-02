import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ensureDosesForDate } from "@/lib/dose-marking";
import FamilyMedicationsClient from "./FamilyMedicationsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Medications & Schedule — CareCircle Family",
  description: "View scheduled medications, monitor adherence, and request refills for your loved one.",
};

export default async function FamilyMedicationsPage() {
  const user = await requireRole("FAMILY");

  const familyMember = await prisma.familyMember.findUnique({
    where: { id: user.id },
    include: {
      patient: {
        include: {
          caregiver: {
            select: { id: true, name: true, email: true, phone: true },
          },
          medications: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
        },
      },
    },
  });

  if (!familyMember || !familyMember.patient) {
    redirect("/family/profile");
  }

  const patientId = familyMember.patient.id;
  await ensureDosesForDate(patientId);

  // Fetch dose logs for schedule and adherence
  const doseLogs = await prisma.doseLog.findMany({
    where: { patientId },
    include: {
      medication: true,
    },
    orderBy: { scheduledFor: "desc" },
    take: 60,
  });

  return (
    <FamilyMedicationsClient
      patient={familyMember.patient}
      medications={familyMember.patient.medications}
      doseLogs={doseLogs}
    />
  );
}
