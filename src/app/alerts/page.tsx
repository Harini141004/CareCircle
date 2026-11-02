import { Metadata } from "next";
import { guardCaregiverClinicalPage } from "@/lib/access";
import CaregiverAlertsClient from "./CaregiverAlertsClient";

export const metadata: Metadata = {
  title: "Clinical Alerts | CareCircle",
  description: "Monitor and resolve real-time clinical alerts, missed doses, refill notifications, and abnormal vitals.",
};

export default async function CaregiverAlertsPage() {
  await guardCaregiverClinicalPage();

  return <CaregiverAlertsClient />;
}
