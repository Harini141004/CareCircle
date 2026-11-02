import { Metadata } from "next";
import { guardCaregiverClinicalPage } from "@/lib/access";
import MedicationsClient from "./MedicationsClient";

export const metadata: Metadata = {
  title: "Medications & Refill Tracker | CareCircle",
  description: "Track prescriptions, log scheduled doses, and manage refill thresholds per patient.",
};

export default async function MedicationsPage() {
  await guardCaregiverClinicalPage();

  return <MedicationsClient />;
}
