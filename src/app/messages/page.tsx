import { Metadata } from "next";
import { guardCaregiverClinicalPage } from "@/lib/access";
import MessagesClient from "./MessagesClient";

export const metadata: Metadata = {
  title: "Care Circle Messaging | CareCircle",
  description: "Secure communication between caregivers, family members, and administrators.",
};

export default async function CaregiverMessagesPage() {
  await guardCaregiverClinicalPage();

  return <MessagesClient />;
}
