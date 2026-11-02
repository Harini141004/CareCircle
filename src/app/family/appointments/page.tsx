import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import FamilyAppointmentsClient from "./FamilyAppointmentsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Appointments & Visits — CareCircle Family",
  description: "View scheduled doctor appointments and visit checklists for your loved one.",
};

export default async function FamilyAppointmentsPage() {
  const user = await requireRole("FAMILY");

  const familyMember = await prisma.familyMember.findUnique({
    where: { id: user.id },
    include: {
      patient: {
        include: {
          caregiver: {
            select: { id: true, name: true, phone: true },
          },
          appointments: {
            include: {
              checklistItems: {
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { dateTime: "asc" },
          },
        },
      },
    },
  });

  if (!familyMember || !familyMember.patient) {
    redirect("/family/profile");
  }

  return (
    <FamilyAppointmentsClient
      patient={familyMember.patient}
      appointments={familyMember.patient.appointments}
    />
  );
}
