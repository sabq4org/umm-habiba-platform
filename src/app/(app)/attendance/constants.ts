import { DAYS_OF_WEEK } from "../schedules/constants";

export const ATTENDANCE_STATUSES = [
  { value: "present", label: "حاضرة", color: "ok" },
  { value: "absent", label: "غائبة", color: "danger" },
  { value: "late", label: "متأخرة", color: "warn" },
  { value: "excused", label: "غياب بعذر", color: "muted" },
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]["value"];

export const STATUS_VALUES = ATTENDANCE_STATUSES.map((s) => s.value);

export function statusLabel(value: string): string {
  return (
    ATTENDANCE_STATUSES.find((s) => s.value === value)?.label ?? value
  );
}

export function statusColor(value: string): string {
  return (
    ATTENDANCE_STATUSES.find((s) => s.value === value)?.color ?? "muted"
  );
}

// JS getDay(): 0=Sunday ... 6=Saturday; school week DAYS_OF_WEEK = [Sun..Thu]
const JS_DAY_TO_AR: Record<number, string | undefined> = {
  0: DAYS_OF_WEEK[0], // الأحد
  1: DAYS_OF_WEEK[1], // الاثنين
  2: DAYS_OF_WEEK[2], // الثلاثاء
  3: DAYS_OF_WEEK[3], // الأربعاء
  4: DAYS_OF_WEEK[4], // الخميس
};

export function arabicDayFromDate(date: Date): string | null {
  return JS_DAY_TO_AR[date.getDay()] ?? null;
}

export function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = isoToDate(value);
  return !Number.isNaN(date.getTime());
}

export function formatArabicDate(iso: string): string {
  const date = isoToDate(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const dayName = arabicDayFromDate(date) ?? "";
  const formatter = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `${dayName} ${formatter.format(date)}`.trim();
}
