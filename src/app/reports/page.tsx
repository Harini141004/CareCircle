import { Metadata } from "next";
import { guardCaregiverClinicalPage } from "@/lib/access";
import ReportsClient from "./ReportsClient";

export const metadata: Metadata = {
  title: "Doctor Visit PDF Reports | CareCircle",
  description: "Generate and print physician summary reports, medication adherence history, and vitals digests per patient.",
};

export default async function ReportsPage() {
  await guardCaregiverClinicalPage();

  return <ReportsClient />;
}
