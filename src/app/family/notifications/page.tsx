import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import FamilyNotificationsClient from "./FamilyNotificationsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Health Notifications & Alerts — CareCircle Family",
  description: "Read clinical alerts and health notifications concerning your loved one.",
};

export default async function FamilyNotificationsPage() {
  const user = await requireRole("FAMILY");

  const familyMember = await prisma.familyMember.findUnique({
    where: { id: user.id },
    include: {
      patient: {
        include: {
          caregiver: {
            select: { id: true, name: true, phone: true },
          },
        },
      },
    },
  });

  if (!familyMember || !familyMember.patient) {
    redirect("/family/profile");
  }

  const alerts = await prisma.alert.findMany({
    where: {
      patientId: familyMember.patient.id,
    },
    include: {
      patient: {
        select: { id: true, name: true, avatarColor: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <FamilyNotificationsClient
      patient={familyMember.patient}
      alerts={alerts}
    />
  );
}
