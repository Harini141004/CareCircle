import { Metadata } from "next";
import { guardPageRole } from "@/lib/access";
import PayrollClient from "./PayrollClient";

export const metadata: Metadata = {
  title: "Caregiver Payroll | CareCircle Admin",
  description: "Performance-based caregiver compensation, adherence bonuses, and payroll disbursement.",
};

export default async function AdminPayrollPage() {
  await guardPageRole("ADMIN");

  return <PayrollClient />;
}
