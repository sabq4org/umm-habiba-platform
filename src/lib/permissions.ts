import { redirect } from "next/navigation";
import type { Role } from "./roles";
import { getCurrentSession, type SessionData } from "./auth";

export type PermissionKey =
  | "dashboard.read"
  | "students.read"
  | "students.write"
  | "students.delete"
  | "teachers.read"
  | "teachers.write"
  | "teachers.delete"
  | "admins.read"
  | "admins.write"
  | "admins.delete"
  | "classes.read"
  | "classes.write"
  | "classes.delete"
  | "subjects.read"
  | "subjects.write"
  | "subjects.delete"
  | "schedules.read"
  | "schedules.write"
  | "schedules.delete"
  | "attendance.read"
  | "attendance.write"
  | "grades.read"
  | "grades.write"
  | "announcements.read"
  | "announcements.write"
  | "announcements.delete"
  | "messages.read"
  | "messages.write"
  | "reports.read"
  | "search.read"
  | "audit.read"
  | "settings.read"
  | "users.read"
  | "users.write"
  | "users.delete"
  | "export.run";

const ADMIN_PERMS: PermissionKey[] = [
  "dashboard.read",
  "students.read",
  "students.write",
  "students.delete",
  "teachers.read",
  "teachers.write",
  "teachers.delete",
  "admins.read",
  "admins.write",
  "admins.delete",
  "classes.read",
  "classes.write",
  "classes.delete",
  "subjects.read",
  "subjects.write",
  "subjects.delete",
  "schedules.read",
  "schedules.write",
  "schedules.delete",
  "attendance.read",
  "attendance.write",
  "grades.read",
  "grades.write",
  "announcements.read",
  "announcements.write",
  "announcements.delete",
  "messages.read",
  "messages.write",
  "reports.read",
  "search.read",
  "audit.read",
  "settings.read",
  "users.read",
  "users.write",
  "users.delete",
  "export.run",
];

const STAFF_PERMS: PermissionKey[] = [
  "dashboard.read",
  "students.read",
  "students.write",
  "students.delete",
  "teachers.read",
  "teachers.write",
  "admins.read",
  "classes.read",
  "classes.write",
  "classes.delete",
  "subjects.read",
  "subjects.write",
  "subjects.delete",
  "schedules.read",
  "schedules.write",
  "schedules.delete",
  "attendance.read",
  "attendance.write",
  "grades.read",
  "grades.write",
  "announcements.read",
  "announcements.write",
  "announcements.delete",
  "messages.read",
  "messages.write",
  "reports.read",
  "search.read",
  "audit.read",
  "settings.read",
  "export.run",
];

const TEACHER_PERMS: PermissionKey[] = [
  "dashboard.read",
  "students.read",
  "teachers.read",
  "classes.read",
  "subjects.read",
  "schedules.read",
  "attendance.read",
  "attendance.write",
  "grades.read",
  "grades.write",
  "announcements.read",
  "messages.read",
  "messages.write",
  "reports.read",
  "search.read",
];

const GUARDIAN_PERMS: PermissionKey[] = [
  "dashboard.read",
  "students.read",
  "attendance.read",
  "grades.read",
  "announcements.read",
  "messages.read",
  "messages.write",
];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<PermissionKey>> = {
  admin: new Set(ADMIN_PERMS),
  staff: new Set(STAFF_PERMS),
  teacher: new Set(TEACHER_PERMS),
  guardian: new Set(GUARDIAN_PERMS),
};

export function can(role: Role | undefined, key: PermissionKey): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(key) ?? false;
}

export function canAny(
  role: Role | undefined,
  keys: PermissionKey[],
): boolean {
  return keys.some((k) => can(role, k));
}

export class ForbiddenError extends Error {
  constructor(message = "ليس لديك صلاحية لتنفيذ هذا الإجراء") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requirePermission(
  key: PermissionKey,
): Promise<SessionData> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  if (!can(session.role, key)) {
    redirect("/forbidden");
  }
  return session;
}

export async function requireAnyPermission(
  keys: PermissionKey[],
): Promise<SessionData> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  if (!canAny(session.role, keys)) {
    redirect("/forbidden");
  }
  return session;
}

export async function requireRole(
  roles: Role[] | Role,
): Promise<SessionData> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(session.role)) {
    redirect("/forbidden");
  }
  return session;
}

/**
 * Throws ForbiddenError instead of redirecting. Useful inside Server Actions
 * where we want the error to bubble up rather than redirect.
 */
export async function assertPermission(
  key: PermissionKey,
): Promise<SessionData> {
  const session = await getCurrentSession();
  if (!session) {
    throw new ForbiddenError("يجب تسجيل الدخول أولاً");
  }
  if (!can(session.role, key)) {
    throw new ForbiddenError();
  }
  return session;
}
