import Link from "next/link";
import { count } from "drizzle-orm";
import {
  Settings as SettingsIcon,
  Users,
  ShieldCheck,
  DatabaseBackup,
} from "lucide-react";
import { db, schema } from "@/db";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requirePermission("settings.read");
  const [usersCount] = await db
    .select({ value: count() })
    .from(schema.users);
  const [auditCount] = await db
    .select({ value: count() })
    .from(schema.auditLogs);
  const canBackup = can(session.role, "backup.read");

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">النظام</span>
          <h1>الإعدادات</h1>
          <p>إدارة الإعدادات العامة للمنصة، الحسابات، والأذونات.</p>
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">إجمالي الحسابات</span>
          <strong className="stat-value">{usersCount?.value ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">سجلات التدقيق</span>
          <strong className="stat-value">{auditCount?.value ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">إصدار المنصة</span>
          <strong className="stat-value">v0.9.0</strong>
        </div>
      </section>

      <section className="settings-grid">
        <Link href="/settings/users" className="settings-card">
          <Users size={22} />
          <div>
            <h3>إدارة المستخدمات</h3>
            <p>إنشاء حسابات جديدة وتعديل الأدوار والحالة.</p>
          </div>
        </Link>
        <Link href="/permissions" className="settings-card">
          <ShieldCheck size={22} />
          <div>
            <h3>الصلاحيات</h3>
            <p>مصفوفة كاملة بصلاحيات كل دور داخل المنصة.</p>
          </div>
        </Link>
        <Link href="/audit" className="settings-card">
          <SettingsIcon size={22} />
          <div>
            <h3>سجل التدقيق</h3>
            <p>متابعة كل العمليات الحساسة على البيانات.</p>
          </div>
        </Link>
        {canBackup ? (
          <Link href="/settings/backup" className="settings-card">
            <DatabaseBackup size={22} />
            <div>
              <h3>النسخ الاحتياطي</h3>
              <p>تصدير كامل بيانات المنصة أو استعادة نسخة سابقة.</p>
            </div>
          </Link>
        ) : null}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>إعدادات المنصة</h3>
        </div>
        <ul className="info-list">
          <li>
            <span>اسم المنصة</span>
            <strong>منصة أم حبيبة التعليمية</strong>
          </li>
          <li>
            <span>المدرسة</span>
            <strong>متوسطة أم حبيبة التعليمية - صبيا</strong>
          </li>
          <li>
            <span>المنطقة الزمنية</span>
            <strong>Asia/Riyadh (UTC+3)</strong>
          </li>
          <li>
            <span>اتجاه الواجهة</span>
            <strong>RTL — العربية</strong>
          </li>
          <li>
            <span>قاعدة البيانات</span>
            <strong>Neon Postgres</strong>
          </li>
        </ul>
      </section>
    </>
  );
}
