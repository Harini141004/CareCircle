import { Metadata } from "next";
import { guardCaregiverClinicalPage } from "@/lib/access";
import PatientsClient from "./PatientsClient";

export const metadata: Metadata = {
  title: "Assigned Patients | CareCircle",
  description: "View and manage dependent patient profiles under your caregiver scope.",
};

export default async function PatientsPage() {
  await guardCaregiverClinicalPage();

  return <PatientsClient />;
}
