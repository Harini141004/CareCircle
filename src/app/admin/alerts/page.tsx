import { guardPageRole } from "@/lib/access";
import AlertsClient from "./AlertsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "System Alerts Oversight — CareCircle Admin",
  description: "Monitor unresolved caregiver alerts, aged escalation thresholds, and administrative follow-ups.",
};

export default async function AdminAlertsPage() {
  const user = await guardPageRole("ADMIN");
  return <AlertsClient adminName={user.name} />;
}
