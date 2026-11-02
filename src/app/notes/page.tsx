import { Metadata } from "next";
import { guardCaregiverClinicalPage } from "@/lib/access";
import CareNotesClient from "./CareNotesClient";

export const metadata: Metadata = {
  title: "Care Notes & Shift Handovers | CareCircle",
  description: "Record daily shift observations, behavioral summaries, and clinical handovers per patient.",
};

export default async function CareNotesPage() {
  await guardCaregiverClinicalPage();

  return <CareNotesClient />;
}
