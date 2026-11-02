import { Metadata } from "next";
import { guardCaregiverClinicalPage } from "@/lib/access";
import PatientDetailClient from "./PatientDetailClient";

export const metadata: Metadata = {
  title: "Patient Chart | CareCircle",
  description: "Comprehensive patient chart with medications, vitals, appointments, family contacts, and care notes.",
};

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardCaregiverClinicalPage();
  const { id } = await params;

  return <PatientDetailClient patientId={id} />;
}
