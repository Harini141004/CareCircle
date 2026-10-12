"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePatientContext } from "@/context/PatientContext";
import {
  LayoutDashboard,
  Users,
  Pill,
  Activity,
  Calendar,
  FileText,
  Sparkles,
  Settings2,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { activePatient } = usePatientContext();

  const navItems = [
    { label: "Overview Dashboard", href: "/dashboard", icon: LayoutDashboard, badge: null },
    { label: "Patient Profiles", href: "/patients", icon: Users, badge: null },
    {
      label: "Medication Tracker",
      href: "/medications",
      icon: Pill,
      badge: activePatient ? `${activePatient._count?.medications || 0}` : null,
    },
    { label: "Vitals & Symptoms", href: "/vitals", icon: Activity, badge: null },
    {
      label: "Doctor Visits",
      href: "/appointments",
      icon: Calendar,
      badge: activePatient ? `${activePatient._count?.appointments || 0}` : null,
    },
    { label: "Doctor Summary Report", href: "/reports", icon: FileText, badge: "PDF", highlight: true },
    { label: "Notification Settings", href: "/settings", icon: Settings2, badge: null },
  ];

  return (
    <aside className="w-64 bg-white text-slate-700 hidden md:flex flex-col shrink-0 border-r border-slate-200 min-h-[calc(100vh-4rem)] shadow-sm">
      {/* Scope Indicator */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/80">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>Active Context</span>
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        </div>
        {activePatient ? (
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div
              className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-xs shadow-sm"
              style={{ backgroundColor: activePatient.avatarColor }}
            >
              {activePatient.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 truncate">{activePatient.name}</div>
              <div className="text-[10px] text-indigo-600 font-medium">{activePatient.relationship}</div>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            Consolidated (All Patients)
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200"
                  : item.highlight
                  ? "bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-white" : item.highlight ? "text-violet-500" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive
                      ? "bg-white/25 text-white"
                      : item.highlight
                      ? "bg-violet-200 text-violet-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400 bg-slate-50/50">
        <div className="font-semibold text-slate-500 mb-1">CareCircle v1.0</div>
        <div>Caregiver Coordination Engine</div>
      </div>
    </aside>
  );
}
