import { getSessionUser, homePathForRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard — CareCircle",
  description: "Enterprise administration control center for CareCircle.",
};

export default async function AdminDashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(homePathForRole(user.role));
  }

  return <AdminDashboardClient adminName={user.name} />;
}
