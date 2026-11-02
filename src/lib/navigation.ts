import { Role } from "./auth";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Activity,
  AlertTriangle,
  FileText,
  DollarSign,
  ClipboardList,
  Settings2,
  ShieldAlert,
  Database,
  User,
  Pill,
  Calendar,
  FileSignature,
  MessageSquare,
  Heart,
  ShieldCheck,
  CalendarDays,
  LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | null;
  badgeKey?: "medications" | "appointments" | "alerts" | "verifications";
  highlight?: boolean;
}

export const ADMIN_NAVIGATION: NavigationItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users, badge: "Admin" },
  { label: "Verification", href: "/admin/verification", icon: UserCheck, badgeKey: "verifications" },
  { label: "Patients", href: "/admin/patients", icon: Activity },
  { label: "Alerts", href: "/admin/alerts", icon: AlertTriangle, badgeKey: "alerts" },
  { label: "Reports", href: "/admin/reports", icon: FileText, highlight: true },
  { label: "Payroll", href: "/admin/payroll", icon: DollarSign },
  { label: "Activity log", href: "/admin/audit", icon: ClipboardList },
  { label: "Settings", href: "/admin/settings", icon: Settings2 },
  { label: "Security", href: "/admin/security", icon: ShieldAlert },
  { label: "Data", href: "/admin/data", icon: Database },
  { label: "My profile", href: "/admin/profile", icon: User },
];

export const CAREGIVER_NAVIGATION: NavigationItem[] = [
  { label: "Today", href: "/dashboard", icon: LayoutDashboard },
  { label: "My patients", href: "/patients", icon: Users },
  { label: "Medications", href: "/medications", icon: Pill, badgeKey: "medications" },
  { label: "Vitals and symptoms", href: "/vitals", icon: Activity },
  { label: "Appointments", href: "/appointments", icon: Calendar, badgeKey: "appointments" },
  { label: "Alerts", href: "/alerts", icon: AlertTriangle, badgeKey: "alerts" },
  { label: "Reports", href: "/reports", icon: FileText, highlight: true },
  { label: "Payroll", href: "/payroll", icon: DollarSign },
  { label: "Notes", href: "/notes", icon: FileSignature },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Settings", href: "/settings", icon: Settings2 },
  { label: "My profile", href: "/profile", icon: User },
];

export const FAMILY_NAVIGATION: NavigationItem[] = [
  { label: "Profile", href: "/family/profile", icon: Heart },
  { label: "Medications", href: "/family/medications", icon: Pill, badgeKey: "medications" },
  { label: "Vitals", href: "/family/vitals", icon: Activity },
  { label: "Appointments", href: "/family/appointments", icon: Calendar, badgeKey: "appointments" },
  { label: "Caregiver", href: "/family/caregiver", icon: ShieldCheck },
  { label: "Messages", href: "/family/messages", icon: MessageSquare },
  { label: "Notifications", href: "/family/notifications", icon: AlertTriangle, badgeKey: "alerts" },
  { label: "My settings", href: "/family/settings", icon: Settings2 },
];

export const ROLE_NAVIGATION_MAP: Record<Role, NavigationItem[]> = {
  ADMIN: ADMIN_NAVIGATION,
  CARETAKER: CAREGIVER_NAVIGATION,
  FAMILY: FAMILY_NAVIGATION,
};

export function getNavigationForRole(role: Role): NavigationItem[] {
  return ROLE_NAVIGATION_MAP[role] || CAREGIVER_NAVIGATION;
}

export function getHomePathForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "CARETAKER":
      return "/dashboard";
    case "FAMILY":
      return "/family/profile";
    default:
      return "/login";
  }
}
