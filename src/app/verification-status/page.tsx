import { Metadata } from "next";
import { guardPageRole } from "@/lib/access";
import { redirect } from "next/navigation";
import VerificationStatusClient from "./VerificationStatusClient";

export const metadata: Metadata = {
  title: "Verification Status | CareCircle",
  description: "Check the status of your caregiver application and compliance verification.",
};

export default async function VerificationStatusPage() {
  const user = await guardPageRole("CARETAKER");

  // If already verified, send to their daily dashboard
  if (user.verificationStatus === "VERIFIED") {
    redirect("/dashboard");
  }

  return (
    <VerificationStatusClient
      status={user.verificationStatus || "PENDING"}
      rejectionReason={user.rejectionReason}
      userName={user.name}
    />
  );
}
