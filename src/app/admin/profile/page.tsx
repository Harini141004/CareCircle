import { guardPageRole } from "@/lib/access";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Profile & Credentials — CareCircle Admin",
  description: "Personal administrator account settings, credential management, and recent activity history.",
};

export default async function AdminProfilePage() {
  const user = await guardPageRole("ADMIN");
  return <ProfileClient adminName={user.name} />;
}
