import { guardPageRole } from "@/lib/access";
import AuditClient from "./AuditClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit & Activity Trail — CareCircle Admin",
  description: "Comprehensive immutable system activity log for administrative actions, security modifications, and clinical drawer views.",
};

export default async function AdminAuditPage() {
  const user = await guardPageRole("ADMIN");
  return <AuditClient adminName={user.name} />;
}
