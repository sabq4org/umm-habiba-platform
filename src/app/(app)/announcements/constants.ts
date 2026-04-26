export const AUDIENCES = [
  { value: "all", label: "الجميع" },
  { value: "staff", label: "الإدارة والمعلمات" },
  { value: "teachers", label: "المعلمات" },
  { value: "students", label: "الطالبات" },
  { value: "guardians", label: "أولياء الأمور" },
] as const;

export type Audience = (typeof AUDIENCES)[number]["value"];

export const AUDIENCE_VALUES: readonly string[] = AUDIENCES.map(
  (a) => a.value,
);

export function audienceLabel(value: string): string {
  return AUDIENCES.find((a) => a.value === value)?.label ?? value;
}
