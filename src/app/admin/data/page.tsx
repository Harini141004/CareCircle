import { Metadata } from "next";
import { guardPageRole } from "@/lib/access";
import DataClient from "./DataClient";

export const metadata: Metadata = {
  title: "Data Management & Backups | CareCircle Admin",
  description: "Download SQLite database backups, export audit-ready CSV records, and inspect database telemetry.",
};

export default async function AdminDataPage() {
  await guardPageRole("ADMIN");

  return <DataClient />;
}
