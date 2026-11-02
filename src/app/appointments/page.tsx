import { Metadata } from "next";
import { guardCaregiverClinicalPage } from "@/lib/access";
import AppointmentsClient from "./AppointmentsClient";

export const metadata: Metadata = {
  title: "Doctor Appointments | CareCircle",
  description: "Schedule doctor appointments, manage pre-visit checklists, and view appointment history.",
};

export default async function AppointmentsPage() {
  await guardCaregiverClinicalPage();

  return <AppointmentsClient />;
}
