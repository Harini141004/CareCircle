import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import FamilyCaregiverClient from "./FamilyCaregiverClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Caregiver Profile & Shift Notes — CareCircle Family",
  description: "Dedicated caregiver credentials, direct contact info, and recent shift notes.",
};

export default async function FamilyCaregiverPage() {
  const user = await requireRole("FAMILY");

  const familyMember = await prisma.familyMember.findUnique({
    where: { id: user.id },
    include: {
      patient: {
        include: {
          caregiver: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              education: true,
              previousExperience: true,
              verificationStatus: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!familyMember || !familyMember.patient) {
    redirect("/family/profile");
  }

  const patientId = familyMember.patient.id;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Fetch shift notes and handovers from last 7 days
  const shiftNotes = await prisma.careNote.findMany({
    where: {
      patientId,
      createdAt: { gte: sevenDaysAgo },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <FamilyCaregiverClient
      patient={familyMember.patient}
      caregiver={familyMember.patient.caregiver}
      shiftNotes={shiftNotes}
    />
  );
}
