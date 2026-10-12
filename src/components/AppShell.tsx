"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { PatientProvider } from "@/context/PatientContext";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/login" || pathname === "/";
  const [caregiverName, setCaregiverName] = useState<string>("Sarah Vance");

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user?.name) {
            setCaregiverName(data.user.name);
          }
        }
      } catch (err) {}
    }
    if (!isPublicPage) loadMe();
  }, [isPublicPage]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <PatientProvider>
      <div className="cc-themed min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <Navbar caregiverName={caregiverName} />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </PatientProvider>
  );
}
