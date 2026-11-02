import { guardPageRole } from "@/lib/access";
import VerificationClient from "./VerificationClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Caregiver Verification — CareCircle Admin",
  description: "Review and verify caregiver credentials, certifications, and clinical experience.",
};

export default async function AdminVerificationPage() {
  const user = await guardPageRole("ADMIN");
  return <VerificationClient adminName={user.name} />;
}
