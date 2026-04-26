import Link from "next/link";
import { and, asc, desc, eq, ne, or } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { ROLES, roleLabel } from "@/lib/roles";
import { NewMessageForm } from "./NewMessageForm";
import { deleteMessageAction, markReadAction } from "./actions";

export const dynamic = "force-dynamic";

type Search = Promise<{ tab?: string; sent?: string; deleted?: string }>;

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  await requirePermission("messages.read");
  const session = await requireUser();
  const params = await searchParams;
  const tab = params.tab === "sent" ? "sent" : "inbox";

  const inboxFilter = or(
    eq(schema.messages.recipientUserId, session.userId),
    eq(schema.messages.recipientRole, session.role),
  );

  const inbox = await db
    .select()
    .from(schema.messages)
    .where(inboxFilter)
    .orderBy(desc(schema.messages.createdAt))
    .limit(80);

  const sent = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.senderUserId, session.userId))
    .orderBy(desc(schema.messages.createdAt))
    .limit(80);

  const unreadCount = inbox.filter((m) => !m.readAt).length;

  const usersList = await db
    .select({
      id: schema.users.id,
      fullName: schema.users.fullName,
      role: schema.users.role,
    })
    .from(schema.users)
    .where(
      and(eq(schema.users.status, "active"), ne(schema.users.id, session.userId)),
    )
    .orderBy(asc(schema.users.fullName));

  const items = tab === "sent" ? sent : inbox;

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">التواصل والرسائل</span>
          <h1>الرسائل الداخلية</h1>
          <p>مراسلات بين المعلمات والإدارة وأولياء الأمور.</p>
        </div>
      </header>

      {params.sent ? <div className="notice ok">تم إرسال الرسالة.</div> : null}
      {params.deleted ? (
        <div className="notice warn">تم حذف الرسالة.</div>
      ) : null}

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">صندوق الوارد</span>
          <strong className="stat-value">{inbox.length}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">غير مقروءة</span>
          <strong className="stat-value">{unreadCount}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">المرسلة</span>
          <strong className="stat-value">{sent.length}</strong>
        </div>
      </section>

      <section className="two-col">
        <div className="card">
          <div className="card-head">
            <h3>الرسائل</h3>
            <div className="filters">
              <Link
                href="/messages?tab=inbox"
                className={`chip ${tab === "inbox" ? "chip-active" : ""}`}
              >
                الوارد
              </Link>
              <Link
                href="/messages?tab=sent"
                className={`chip ${tab === "sent" ? "chip-active" : ""}`}
              >
                المرسلة
              </Link>
            </div>
          </div>
          <ul className="message-list">
            {items.length === 0 ? (
              <li className="muted-text">لا توجد رسائل.</li>
            ) : (
              items.map((m) => (
                <li
                  key={m.id}
                  className={`message-item ${
                    !m.readAt && tab === "inbox" ? "unread" : ""
                  }`}
                >
                  <div className="message-head">
                    <strong>{m.subject}</strong>
                    <span className="message-date">
                      {formatDate(m.createdAt as Date)}
                    </span>
                  </div>
                  <div className="message-meta">
                    {tab === "sent" ? (
                      <>
                        إلى:{" "}
                        {m.recipientRole
                          ? `فئة ${roleLabel(m.recipientRole)}`
                          : "مستلمة محددة"}
                      </>
                    ) : (
                      <>من: {m.senderLabel ?? "مجهول"}</>
                    )}
                  </div>
                  <p className="message-body">{m.body}</p>
                  <div className="message-actions">
                    {tab === "inbox" && !m.readAt ? (
                      <form action={markReadAction.bind(null, m.id)}>
                        <button type="submit" className="ghost-button">
                          وضع كمقروءة
                        </button>
                      </form>
                    ) : null}
                    <form action={deleteMessageAction.bind(null, m.id)}>
                      <button
                        type="submit"
                        className="ghost-button danger"
                        title="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>رسالة جديدة</h3>
          </div>
          <NewMessageForm
            users={usersList}
            roles={ROLES.map((r) => ({ value: r.value, label: r.label }))}
          />
        </div>
      </section>
    </>
  );
}

