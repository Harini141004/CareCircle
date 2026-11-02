import { Metadata } from "next";
import { requireUser } from "@/lib/access";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "Notification Settings | CareCircle",
  description: "Configure email alerts, in-app notification triggers, and communication channels.",
};

export default async function SettingsPage() {
  await requireUser();

  return <SettingsClient />;
}
