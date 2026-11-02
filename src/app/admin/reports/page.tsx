import { guardPageRole } from "@/lib/access";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Administrative Reports — CareCircle Admin",
  description: "Enterprise reports for caregiver adherence, patient coverage ratios, and compliance metrics.",
};

export default async function AdminReportsPage() {
  const user = await guardPageRole("ADMIN");
  return <ReportsClient adminName={user.name} />;
}
