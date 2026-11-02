import { guardPageRole } from "@/lib/access";
import PatientsClient from "./PatientsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Patients Oversight — CareCircle Admin",
  description: "Administrative patient oversight, caregiver assignment, and linked family member records.",
};

export default async function AdminPatientsPage() {
  const user = await guardPageRole("ADMIN");
  return <PatientsClient adminName={user.name} />;
}
