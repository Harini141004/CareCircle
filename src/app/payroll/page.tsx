import { Metadata } from "next";
import { guardCaregiverClinicalPage } from "@/lib/access";
import CaregiverPayrollClient from "./CaregiverPayrollClient";

export const metadata: Metadata = {
  title: "Caregiver Compensation & Payroll | CareCircle",
  description: "Review your monthly base compensation, medication adherence performance bonus, and disbursement history.",
};

export default async function CaregiverPayrollPage() {
  await guardCaregiverClinicalPage();

  return <CaregiverPayrollClient />;
}
