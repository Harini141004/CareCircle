import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import FamilyVitalsClient from "./FamilyVitalsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vitals & Symptoms — CareCircle Family",
  description: "View-only health recordings and clinical symptom logs for your loved one.",
};

export default async function FamilyVitalsPage() {
  const user = await requireRole("FAMILY");

  const familyMember = await prisma.familyMember.findUnique({
    where: { id: user.id },
    include: {
      patient: {
        include: {
          caregiver: {
            select: { id: true, name: true, phone: true },
          },
          symptomLogs: {
            orderBy: { timestamp: "desc" },
            take: 50,
          },
        },
      },
    },
  });

  if (!familyMember || !familyMember.patient) {
    redirect("/family/profile");
  }

  return (
    <FamilyVitalsClient
      patient={familyMember.patient}
      logs={familyMember.patient.symptomLogs}
    />
  );
}
