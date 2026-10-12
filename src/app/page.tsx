import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { HomePage } from "@/components/HomePage";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return <HomePage />;
}
