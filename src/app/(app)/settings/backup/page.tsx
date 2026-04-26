import Link from "next/link";
import { count } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { INSERT_ORDER, type SnapshotTableKey } from "@/lib/backup";
import { BackupClient } from "./BackupClient";

export const dynamic = "force-dynamic";

const TABLE_LABELS: Record<SnapshotTableKey, string> = {
  students: "الطالبات",
  teachers: "المعلمات",
  admins: "المسؤولات",
  classes: "الفصول",
  subjects: "المواد",
  scheduleEntries: "الجداول الدراسية",
  attendanceRecords: "سجل الحضور",
  assessments: "التقييمات",
  studentGrades: "الدرجات",
  users: "حسابات الدخول",
  announcements: "الإعلانات",
  messages: "الرسائل",
  auditLogs: "سجل التدقيق",
  loginAttempts: "محاولات الدخول",
};

export default async function BackupPage() {
  await requirePermission("backup.read");

  const counts = await Promise.all(
    INSERT_ORDER.map(async (key) => {
      const [row] = await db.select({ value: count() }).from(schema[key]);
      return { key, value: row?.value ?? 0 };
    }),
  );
  const total = counts.reduce((acc, r) => acc + r.value, 0);

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            <Link href="/settings">الإعدادات</Link>
            <ChevronRight size={14} style={{ margin: "0 6px" }} />
            النسخ الاحتياطي
          </span>
          <h1>حفظ البيانات وتصديرها واستيرادها</h1>
          <p>
            خذي نسخة كاملة من بيانات المنصة في أي وقت، أو استعيدي نسخة سابقة
            عند الحاجة.
          </p>
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">إجمالي الصفوف</span>
          <strong className="stat-value">{total}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">عدد الجداول</span>
          <strong className="stat-value">{INSERT_ORDER.length}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">صيغة النسخة</span>
          <strong className="stat-value">JSON</strong>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>محتوى النسخة الاحتياطية</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>الجدول</th>
              <th>عدد الصفوف الحالية</th>
            </tr>
          </thead>
          <tbody>
            {counts.map(({ key, value }) => (
              <tr key={key}>
                <td>{TABLE_LABELS[key]}</td>
                <td>
                  <strong>{value}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <BackupClient exportHref="/api/admin/backup/export" />
    </>
  );
}
