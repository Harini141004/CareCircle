import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import FamilySettingsClient from "./FamilySettingsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Family Settings & Notifications — CareCircle",
  description: "Configure email notification preferences, update personal contact info, and manage password security.",
};

export default async function FamilySettingsPage() {
  const user = await requireRole("FAMILY");

  const familyMember = await prisma.familyMember.findUnique({
    where: { id: user.id },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!familyMember) {
    redirect("/login");
  }

  const prefs = await prisma.notificationPreference.findUnique({
    where: {
      userType_userId: {
        userType: "FAMILY",
        userId: user.id,
      },
    },
  });

  return (
    <FamilySettingsClient
      familyMember={{
        id: familyMember.id,
        name: familyMember.name,
        email: familyMember.email,
        phone: familyMember.phone,
        relationship: familyMember.relationship,
        relationshipOther: familyMember.relationshipOther,
        isPrimaryContact: familyMember.isPrimaryContact,
        patientName: familyMember.patient?.name || "Patient",
      }}
      initialPreferences={{
        emailAlerts: prefs?.emailAlerts ?? true,
        notifyVitalsWarning: prefs?.notifyVitalsWarning ?? true,
        notifyRefillDue: prefs?.notifyRefillDue ?? true,
        notifyAppointment: prefs?.notifyAppointment ?? true,
        notificationEmail: prefs?.notificationEmail || "",
      }}
    />
  );
}
