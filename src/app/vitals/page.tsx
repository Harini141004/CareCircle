import { Metadata } from "next";
import { guardCaregiverClinicalPage } from "@/lib/access";
import VitalsClient from "./VitalsClient";

export const metadata: Metadata = {
  title: "Vitals & Symptom Trends | CareCircle",
  description: "Monitor blood pressure, blood glucose, heart rate, and clinical symptoms per patient.",
};

export default async function VitalsPage() {
  await guardCaregiverClinicalPage();

  return <VitalsClient />;
}
