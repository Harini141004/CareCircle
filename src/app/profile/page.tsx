import { Metadata } from "next";
import { requireRole } from "@/lib/access";
import CaregiverProfileClient from "./CaregiverProfileClient";

export const metadata: Metadata = {
  title: "Caregiver Profile & Credentials | CareCircle",
  description: "View professional credentials, verification status, adherence score tier, and security settings.",
};

export default async function CaregiverProfilePage() {
  const user = await requireRole("CARETAKER");

  return <CaregiverProfileClient caregiverId={user.id} />;
}
