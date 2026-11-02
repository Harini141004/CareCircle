"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePatientContext } from "@/context/PatientContext";
import { useAuth } from "@/context/AuthContext";
import { AlertsDrawer } from "./AlertsDrawer";
import { ThemeSwitcher } from "./ThemeSwitcher";
import {
  Heart,
  ChevronDown,
  UserPlus,
  Users,
  LogOut,
  User,
  ShieldCheck,
  Settings2,
  LayoutDashboard,
} from "lucide-react";

import { getHomePathForRole } from "@/lib/navigation";

export function Navbar({ caregiverName }: { caregiverName?: string }) {
  const { user, logout } = useAuth();
  const { patients, activePatientId, activePatient, setActivePatientId } =
    usePatientContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName = user?.name || caregiverName || "User";
  const userRole = user?.role || "CARETAKER";

  const brandHref = getHomePathForRole(userRole);

  const roleLabel =
    userRole === "ADMIN"
      ? "System Administrator"
      : userRole === "FAMILY"
      ? "Family Member"
      : "Primary Caregiver";

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href={brandHref} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-700 via-violet-600 to-slate-900 dark:from-indigo-400 dark:to-slate-100 bg-clip-text text-transparent">
                CareCircle
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
                {userRole === "ADMIN" ? "Admin" : userRole === "FAMILY" ? "Family View" : "Multi-Patient"}
              </span>
            </div>
          </Link>

          {/* Patient Switcher Dropdown (Caregiver & Admin) */}
          {userRole !== "FAMILY" && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/70 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200 transition-all shadow-sm"
              >
                {activePatientId === "all" ? (
                  <>
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate max-w-[140px] sm:max-w-xs font-semibold">
                      All Dependents
                    </span>
                  </>
                ) : activePatient ? (
                  <>
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
                      style={{ backgroundColor: activePatient.avatarColor }}
                    >
                      {activePatient.name.charAt(0)}
                    </div>
                    <span className="truncate max-w-[140px] sm:max-w-xs font-semibold">
                      {activePatient.name}
                    </span>
                  </>
                ) : (
                  <span>Select Patient</span>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 p-2 animate-in fade-in duration-150">
                    <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-3 py-1.5">
                      Active Patient Scope
                    </div>
                    <button
                      onClick={() => {
                        setActivePatientId("all");
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        activePatientId === "all"
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="text-left flex-1">
                        <div>All Dependents</div>
                        <div className="text-[10px] text-slate-400">
                          Consolidated View
                        </div>
                      </div>
                    </button>

                    <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

                    <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-3 py-1">
                      Dependents ({patients.length})
                    </div>

                    <div className="space-y-0.5 max-h-48 overflow-y-auto">
                      {patients.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setActivePatientId(p.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                            activePatientId === p.id
                              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div
                            className="w-7 h-7 rounded-lg text-white flex items-center justify-center text-xs font-bold shadow-sm"
                            style={{ backgroundColor: p.avatarColor }}
                          >
                            {p.name.charAt(0)}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className="truncate font-medium">{p.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {p.relationship}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

                    <Link
                      href="/patients"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Manage & Add Patient Profiles
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Family Member Active Patient Tag */}
          {userRole === "FAMILY" && activePatient && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-xs font-medium text-violet-700 dark:text-violet-300">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span>Viewing: <strong className="font-semibold">{activePatient.name}</strong></span>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <AlertsDrawer />

          {/* Account Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                {displayName.charAt(0)}
              </div>
              <span className="hidden md:inline-block text-sm font-semibold text-slate-700 dark:text-slate-200">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 p-2 animate-in fade-in duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-indigo-500" /> {roleLabel}
                    </p>
                  </div>

                  <div className="py-1">
                    {userRole === "ADMIN" && (
                      <>
                        <Link
                          href="/admin/users"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors"
                        >
                          <Users className="w-4 h-4 text-indigo-500" /> Users Management
                        </Link>
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-slate-400" /> Admin Dashboard
                        </Link>
                      </>
                    )}

                    {userRole === "FAMILY" && (
                      <Link
                        href="/family/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors"
                      >
                        <User className="w-4 h-4 text-indigo-500" /> Family Profile
                      </Link>
                    )}

                    {userRole === "CARETAKER" && (
                      <>
                        <Link
                          href="/patients"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                          <User className="w-4 h-4 text-slate-400" /> Patient Profiles
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                          <Settings2 className="w-4 h-4 text-slate-400" /> Notification Settings
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
