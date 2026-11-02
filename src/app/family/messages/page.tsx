import { Metadata } from "next";
import { requireRole } from "@/lib/access";
import MessagesClient from "@/app/messages/MessagesClient";

export const metadata: Metadata = {
  title: "Family Circle Messages — CareCircle",
  description: "Secure group conversation between family members, primary caregivers, and administrators.",
};

export default async function FamilyMessagesPage() {
  await requireRole("FAMILY");

  return <MessagesClient />;
}
