export const ROLES = [
  { value: "admin", label: "مديرة المدرسة" },
  { value: "staff", label: "إدارية / وكيلة" },
  { value: "teacher", label: "معلمة" },
  { value: "guardian", label: "ولية أمر" },
] as const;

export type Role = (typeof ROLES)[number]["value"];

export const ROLE_VALUES: readonly Role[] = ROLES.map((r) => r.value);

export function isRole(value: string): value is Role {
  return (ROLE_VALUES as readonly string[]).includes(value);
}

export function roleLabel(value: string): string {
  return ROLES.find((r) => r.value === value)?.label ?? value;
}

type Permission = "yes" | "limited" | "no";

type PermissionRow = {
  feature: string;
  description?: string;
  byRole: Record<Role, Permission>;
};

export const PERMISSION_MATRIX: PermissionRow[] = [
  {
    feature: "لوحة التحكم",
    description: "الإحصائيات العامة للمنصة.",
    byRole: { admin: "yes", staff: "yes", teacher: "limited", guardian: "limited" },
  },
  {
    feature: "إدارة الطالبات",
    description: "إضافة، تعديل، حذف بيانات الطالبات.",
    byRole: { admin: "yes", staff: "yes", teacher: "limited", guardian: "no" },
  },
  {
    feature: "إدارة المعلمات",
    description: "ملف المعلمة والتخصصات والأنصبة.",
    byRole: { admin: "yes", staff: "limited", teacher: "limited", guardian: "no" },
  },
  {
    feature: "إدارة الإداريات",
    description: "بيانات الكادر الإداري.",
    byRole: { admin: "yes", staff: "limited", teacher: "no", guardian: "no" },
  },
  {
    feature: "الفصول والشعب",
    description: "إنشاء الفصول وتعيين رائدات الفصل.",
    byRole: { admin: "yes", staff: "yes", teacher: "limited", guardian: "no" },
  },
  {
    feature: "المواد الدراسية",
    description: "إنشاء المواد وربطها بالمعلمات.",
    byRole: { admin: "yes", staff: "yes", teacher: "limited", guardian: "no" },
  },
  {
    feature: "الجداول الأسبوعية",
    description: "بناء جداول الفصول والحصص.",
    byRole: { admin: "yes", staff: "yes", teacher: "limited", guardian: "no" },
  },
  {
    feature: "الحضور والغياب",
    description: "تسجيل ومتابعة الحضور اليومي.",
    byRole: { admin: "yes", staff: "yes", teacher: "yes", guardian: "limited" },
  },
  {
    feature: "الدرجات والشهادات",
    description: "إدخال درجات التقييمات وإصدار الشهادات.",
    byRole: { admin: "yes", staff: "yes", teacher: "yes", guardian: "limited" },
  },
  {
    feature: "الإعلانات",
    description: "إنشاء إعلانات داخلية ومتابعتها.",
    byRole: { admin: "yes", staff: "yes", teacher: "limited", guardian: "limited" },
  },
  {
    feature: "الرسائل",
    description: "تواصل بين المعلمات والإدارة وأولياء الأمور.",
    byRole: { admin: "yes", staff: "yes", teacher: "yes", guardian: "yes" },
  },
  {
    feature: "التقارير التحليلية",
    description: "لوحات تجميعية لمؤشرات الأداء.",
    byRole: { admin: "yes", staff: "yes", teacher: "limited", guardian: "no" },
  },
  {
    feature: "البحث الموحد",
    description: "البحث في كل سجلات المنصة.",
    byRole: { admin: "yes", staff: "yes", teacher: "limited", guardian: "limited" },
  },
  {
    feature: "سجل التدقيق",
    description: "متابعة جميع التغييرات الحساسة.",
    byRole: { admin: "yes", staff: "limited", teacher: "no", guardian: "no" },
  },
  {
    feature: "إدارة المستخدمات والصلاحيات",
    description: "إنشاء حسابات وتغيير الصلاحيات.",
    byRole: { admin: "yes", staff: "no", teacher: "no", guardian: "no" },
  },
];

export function permissionLabel(value: Permission): string {
  switch (value) {
    case "yes":
      return "كامل";
    case "limited":
      return "جزئي";
    case "no":
      return "غير متاح";
  }
}

export function permissionTone(value: Permission): "ok" | "amber" | "danger" {
  switch (value) {
    case "yes":
      return "ok";
    case "limited":
      return "amber";
    case "no":
      return "danger";
  }
}
