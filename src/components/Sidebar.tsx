"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePatientContext } from "@/context/PatientContext";
import { useAuth } from "@/context/AuthContext";
import { getNavigationForRole, NavigationItem } from "@/lib/navigation";
import { Sparkles, ShieldCheck, Users } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { activePatient } = usePatientContext();
  const { user } = useAuth();
  const role = user?.role || "CARETAKER";

  const navItems: NavigationItem[] = getNavigationForRole(role);

  const getDynamicBadge = (item: NavigationItem) => {
    if (item.badge) return item.badge;
    if (!item.badgeKey) return null;

    if (item.badgeKey === "medications") {
      const count = activePatient?._count?.medications;
      return count !== undefined && count > 0 ? `${count}` : null;
    }
    if (item.badgeKey === "appointments") {
      const count = activePatient?._count?.appointments;
      return count !== undefined && count > 0 ? `${count}` : null;
    }
    if (item.badgeKey === "alerts") {
      const count = activePatient?._count?.alerts;
      return count !== undefined && count > 0 ? `${count}` : null;
    }
    return null;
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hidden md:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 min-h-[calc(100vh-4rem)] shadow-sm">
      {/* Scope Indicator */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>{role === "ADMIN" ? "Admin Scope" : "Active Context"}</span>
          {role === "ADMIN" ? (
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          )}
        </div>
        {activePatient ? (
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div
              className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-xs shadow-sm"
              style={{ backgroundColor: activePatient.avatarColor }}
            >
              {activePatient.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {activePatient.name}
              </div>
              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                {activePatient.relationship}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            {role === "ADMIN" ? "System-Wide Scope" : "Consolidated (All Patients)"}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const badgeText = getDynamicBadge(item);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-950/40"
                  : item.highlight
                  ? "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-100 dark:border-violet-900"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? "text-white"
                      : item.highlight
                      ? "text-violet-500"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {badgeText && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive
                      ? "bg-white/25 text-white"
                      : item.highlight
                      ? "bg-violet-200 text-violet-700 dark:bg-violet-900 dark:text-violet-200"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {badgeText}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="font-semibold text-slate-500 dark:text-slate-400 mb-1">CareCircle v1.0</div>
        <div>
          {role === "ADMIN"
            ? "Admin Control Center"
            : role === "FAMILY"
            ? "Family Patient Portal"
            : "Caregiver Coordination Engine"}
        </div>
      </div>
    </aside>
  );
}
