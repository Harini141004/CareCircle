import { redirect } from "next/navigation";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { HomePage } from "@/components/HomePage";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();

  if (user) {
    redirect(homePathForRole(user.role));
  }

  return <HomePage />;
}
