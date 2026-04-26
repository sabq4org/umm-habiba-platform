import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { db, schema } from "@/db";
import { requirePermission, can } from "@/lib/permissions";
import { audienceLabel, AUDIENCES } from "./constants";
import { NewAnnouncementForm } from "./NewAnnouncementForm";
import {
  deleteAnnouncementAction,
  togglePinAction,
} from "./actions";

export const dynamic = "force-dynamic";

type Search = Promise<{
  audience?: string;
  published?: string;
  deleted?: string;
}>;

function formatDate(date: Date | null): string {
  if (!date) return "—";
  const formatter = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(date);
}

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const session = await requirePermission("announcements.read");
  const canPublish = can(session.role, "announcements.write");
  const canRemove = can(session.role, "announcements.delete");
  const params = await searchParams;
  const audience = params.audience ?? "";

  const filterClause = audience
    ? sql`${schema.announcements.audience} = ${audience}`
    : sql`true`;

  const list = await db
    .select()
    .from(schema.announcements)
    .where(filterClause)
    .orderBy(desc(schema.announcements.pinned), desc(schema.announcements.createdAt));

  const stats = await db
    .select({
      total: sql<number>`count(*)::int`,
      pinned: sql<number>`count(*) filter (where ${schema.announcements.pinned})::int`,
    })
    .from(schema.announcements);

  const totalAll = stats[0]?.total ?? 0;
  const pinnedCount = stats[0]?.pinned ?? 0;

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">التواصل والإعلانات</span>
          <h1>الإعلانات الداخلية</h1>
          <p>نشر التعاميم، التذكيرات، والرسائل العامة لكل أسرة المدرسة.</p>
        </div>
      </header>

      {params.published ? (
        <div className="notice ok">تم نشر الإعلان بنجاح.</div>
      ) : null}
      {params.deleted ? (
        <div className="notice warn">تم حذف الإعلان.</div>
      ) : null}

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">إجمالي الإعلانات</span>
          <strong className="stat-value">{totalAll}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">المثبّتة</span>
          <strong className="stat-value">{pinnedCount}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">الجمهور المتاح</span>
          <strong className="stat-value">{AUDIENCES.length}</strong>
        </div>
      </section>

      <section className="two-col">
        <div className="card">
          <div className="card-head">
            <h3>الإعلانات</h3>
            <div className="filters">
              <Link
                href="/announcements"
                className={`chip ${audience === "" ? "chip-active" : ""}`}
              >
                الكل
              </Link>
              {AUDIENCES.map((a) => (
                <Link
                  key={a.value}
                  href={`/announcements?audience=${a.value}`}
                  className={`chip ${audience === a.value ? "chip-active" : ""}`}
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
          <ul className="announcement-list">
            {list.length === 0 ? (
              <li className="muted-text">لا توجد إعلانات بعد.</li>
            ) : (
              list.map((a) => (
                <li
                  key={a.id}
                  className={`announcement-item ${a.pinned ? "pinned" : ""}`}
                >
                  <div className="announcement-head">
                    <div>
                      <span className={`audience-chip aud-${a.audience}`}>
                        {audienceLabel(a.audience)}
                      </span>
                      {a.pinned ? (
                        <span className="audience-chip aud-pinned">مثبت</span>
                      ) : null}
                    </div>
                    <div className="announcement-actions">
                      {canPublish ? (
                        <form
                          action={togglePinAction.bind(null, a.id, !a.pinned)}
                        >
                          <button
                            className="ghost-button"
                            type="submit"
                            title={a.pinned ? "إلغاء التثبيت" : "تثبيت"}
                          >
                            {a.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                          </button>
                        </form>
                      ) : null}
                      {canRemove ? (
                        <form action={deleteAnnouncementAction.bind(null, a.id)}>
                          <button
                            className="ghost-button danger"
                            type="submit"
                            title="حذف"
                          >
                            <Trash2 size={14} />
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                  <h4>{a.title}</h4>
                  <p>{a.body}</p>
                  <div className="announcement-meta">
                    <span>{a.createdByLabel ?? "النظام"}</span>
                    <span>·</span>
                    <span>{formatDate(a.createdAt as Date)}</span>
                    {a.expiresAt ? (
                      <>
                        <span>·</span>
                        <span>
                          ينتهي:{" "}
                          {formatDate(a.expiresAt as Date)}
                        </span>
                      </>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {canPublish ? (
          <div className="card">
            <div className="card-head">
              <h3>إعلان جديد</h3>
            </div>
            <NewAnnouncementForm />
          </div>
        ) : (
          <div className="card">
            <div className="card-head">
              <h3>الإعلانات</h3>
            </div>
            <p className="muted-text">
              فقط الإدارة تقدر تنشر إعلان. للاستفسار راسلي الإدارة من
              قسم الرسائل.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
