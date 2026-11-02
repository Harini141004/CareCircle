import { Metadata } from "next";
import { guardCaregiverClinicalPage } from "@/lib/access";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Caregiver Dashboard | CareCircle",
  description: "Daily overview of dependent patient medications, upcoming appointments, and active alerts.",
};

export default async function DashboardPage() {
  await guardCaregiverClinicalPage();

  return <DashboardClient />;
}
