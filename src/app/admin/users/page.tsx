import { getSessionUser, homePathForRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "User Management — CareCircle Admin",
  description: "Centralized administrator control for Admins, Caregivers, Patients, and Family Members.",
};

export default async function AdminUsersPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(homePathForRole(user.role));
  }

  return <UsersClient currentAdminId={user.id} />;
}
