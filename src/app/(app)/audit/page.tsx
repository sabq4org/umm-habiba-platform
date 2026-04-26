import { count, desc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type Search = Promise<{ entity?: string; action?: string }>;

const ENTITY_LABELS: Record<string, string> = {
  user: "حسابات",
  student: "طالبات",
  teacher: "معلمات",
  admin: "إداريات",
  class: "فصول",
  subject: "مواد",
  schedule: "جداول",
  attendance: "حضور",
  assessment: "تقييمات",
  grade: "درجات",
  announcement: "إعلانات",
  message: "رسائل",
  settings: "إعدادات",
};

const ACTION_LABELS: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
  login: "تسجيل دخول",
  logout: "خروج",
  record: "تسجيل",
  publish: "نشر",
  remove: "إزالة",
};

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  await requirePermission("audit.read");
  const params = await searchParams;
  const entity = params.entity ?? "";
  const action = params.action ?? "";

  let where = sql`true`;
  if (entity) where = sql`${where} and ${schema.auditLogs.entity} = ${entity}`;
  if (action) where = sql`${where} and ${schema.auditLogs.action} = ${action}`;

  const list = await db
    .select({
      id: schema.auditLogs.id,
      action: schema.auditLogs.action,
      entity: schema.auditLogs.entity,
      entityId: schema.auditLogs.entityId,
      actorLabel: schema.auditLogs.actorLabel,
      summary: schema.auditLogs.summary,
      createdAt: schema.auditLogs.createdAt,
    })
    .from(schema.auditLogs)
    .where(where)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(150);

  const [total] = await db
    .select({ value: count() })
    .from(schema.auditLogs);

  const byEntity = await db
    .select({
      entity: schema.auditLogs.entity,
      total: sql<number>`count(*)::int`,
    })
    .from(schema.auditLogs)
    .groupBy(schema.auditLogs.entity)
    .orderBy(desc(sql`count(*)`));

  const byAction = await db
    .select({
      action: schema.auditLogs.action,
      total: sql<number>`count(*)::int`,
    })
    .from(schema.auditLogs)
    .groupBy(schema.auditLogs.action)
    .orderBy(desc(sql`count(*)`));

  const last24h = await db
    .select({ value: count() })
    .from(schema.auditLogs)
    .where(sql`${schema.auditLogs.createdAt} >= now() - interval '1 day'`);

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">النظام</span>
          <h1>سجل التدقيق</h1>
          <p>
            تسجيل لكل العمليات الحساسة على المنصة، مع المُنفّذ والتوقيت
            والتفاصيل.
          </p>
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">إجمالي السجلات</span>
          <strong className="stat-value">{total?.value ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">آخر 24 ساعة</span>
          <strong className="stat-value">{last24h[0]?.value ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">أنواع الكيانات</span>
          <strong className="stat-value">{byEntity.length}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">أنواع الإجراءات</span>
          <strong className="stat-value">{byAction.length}</strong>
        </div>
      </section>

      <section className="filters-bar">
        <a href="/audit" className={`chip ${!entity && !action ? "chip-active" : ""}`}>
          الكل
        </a>
        {byEntity.map((e) => (
          <a
            key={e.entity}
            href={`/audit?entity=${e.entity}`}
            className={`chip ${entity === e.entity ? "chip-active" : ""}`}
          >
            {ENTITY_LABELS[e.entity] ?? e.entity} ({e.total})
          </a>
        ))}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>السجلات الأخيرة</h3>
          <span className="muted-text">{list.length} عملية</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>المنفذة</th>
                <th>الإجراء</th>
                <th>الكيان</th>
                <th>الوصف</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted-text">لا توجد سجلات بعد.</td>
                </tr>
              ) : (
                list.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.createdAt as Date)}</td>
                    <td>{row.actorLabel ?? "النظام"}</td>
                    <td>
                      <span className={`status-chip status-muted`}>
                        {ACTION_LABELS[row.action] ?? row.action}
                      </span>
                    </td>
                    <td>{ENTITY_LABELS[row.entity] ?? row.entity}</td>
                    <td>{row.summary ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
