import { Metadata } from "next";
import { guardPageRole } from "@/lib/access";
import SecurityClient from "./SecurityClient";

export const metadata: Metadata = {
  title: "Security & Access Control | CareCircle Admin",
  description: "Monitor authentication telemetry, failed login attempts, locked accounts, and session revocation.",
};

export default async function AdminSecurityPage() {
  await guardPageRole("ADMIN");

  return <SecurityClient />;
}
