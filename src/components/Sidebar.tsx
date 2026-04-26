"use client";

import {
  BookMarked,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldCheck,
  History,
  Briefcase,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/roles";

type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  roles?: Role[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const ALL_ROLES: Role[] = ["admin", "staff", "teacher", "guardian"];

const navGroups: NavGroup[] = [
  {
    label: "نظرة عامة",
    items: [
      { label: "لوحة الإدارة", icon: LayoutDashboard, href: "/" },
      { label: "التقارير", icon: FileText, href: "/reports", roles: ["admin", "staff", "teacher"] },
    ],
  },
  {
    label: "الأكاديمي",
    items: [
      { label: "الطالبات", icon: GraduationCap, href: "/students" },
      { label: "المعلمات", icon: UserRound, href: "/teachers", roles: ["admin", "staff", "teacher"] },
      { label: "الإداريات", icon: Briefcase, href: "/admins", roles: ["admin", "staff"] },
      { label: "الفصول", icon: BookOpen, href: "/classes", roles: ["admin", "staff", "teacher"] },
      { label: "المواد", icon: BookMarked, href: "/subjects", roles: ["admin", "staff", "teacher"] },
      { label: "الجداول", icon: CalendarDays, href: "/schedules", roles: ["admin", "staff", "teacher"] },
      { label: "الحضور والغياب", icon: ClipboardList, href: "/attendance" },
      { label: "الدرجات", icon: ClipboardCheck, href: "/grades" },
    ],
  },
  {
    label: "التواصل",
    items: [
      { label: "الإعلانات", icon: Megaphone, href: "/announcements" },
      { label: "الرسائل", icon: MessageSquare, href: "/messages" },
    ],
  },
  {
    label: "النظام",
    items: [
      { label: "الصلاحيات", icon: ShieldCheck, href: "/permissions", roles: ["admin", "staff"] },
      { label: "سجل التدقيق", icon: History, href: "/audit", roles: ["admin", "staff"] },
      { label: "الإعدادات", icon: Settings, href: "/settings", roles: ["admin"] },
    ],
  },
];

function isActive(currentPath: string | null, href: string): boolean {
  if (!currentPath) return false;
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function visibleFor(role: Role, item: NavItem): boolean {
  return (item.roles ?? ALL_ROLES).includes(role);
}

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <nav aria-label="أقسام المنصة">
      {navGroups.map((group) => {
        const items = group.items.filter((item) => visibleFor(role, item));
        if (items.length === 0) return null;
        return (
          <div key={group.label}>
            <p className="nav-label">{group.label}</p>
            <ul className="nav-list">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      className={`nav-item ${active ? "active" : ""}`}
                      href={item.href}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
