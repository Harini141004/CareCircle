import { Metadata } from "next";
import { guardPageRole } from "@/lib/access";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "System Settings | CareCircle Admin",
  description: "Configure system-wide clinical thresholds, alert escalation timers, and notification routing.",
};

export default async function AdminSettingsPage() {
  await guardPageRole("ADMIN");

  return <SettingsClient />;
}
