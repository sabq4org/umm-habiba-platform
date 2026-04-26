import { Briefcase, Building2, Download, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { asc, ilike, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { can, requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string };

const statusLabels: Record<string, string> = {
  active: "على رأس العمل",
  leave: "في إجازة",
  transferred: "منقولة",
  resigned: "مستقيلة",
};

export default async function AdminsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requirePermission("admins.read");
  const canExport = can(session.role, "export.run");
  const canCreate = session.role === "admin" || session.role === "staff";
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const baseQuery = db
    .select()
    .from(schema.admins)
    .orderBy(asc(schema.admins.fullName));

  const adminsList = query
    ? await baseQuery.where(
        or(
          ilike(schema.admins.fullName, `%${query}%`),
          ilike(schema.admins.nationalId, `%${query}%`),
          ilike(schema.admins.jobTitle, `%${query}%`),
          ilike(schema.admins.department, `%${query}%`),
        ),
      )
    : await baseQuery;

  const departments = new Set(adminsList.map((admin) => admin.department));
  const titles = new Set(adminsList.map((admin) => admin.jobTitle));

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <Briefcase size={14} strokeWidth={2} />
            وحدة الإداريات
          </p>
          <h2 className="page-title">قائمة الإداريات</h2>
          <p className="page-subtitle">
            عرض ملفات الإداريات في المدرسة، الأقسام، المسميات الوظيفية، والمهام المسندة.
            يمكن البحث بالاسم، الهوية، المسمى، أو القسم.
          </p>
        </div>

        <div className="top-actions">
          <form className="search-form" role="search">
            <input
              className="search"
              aria-label="بحث في الإداريات"
              placeholder="بحث بالاسم أو القسم"
              name="q"
              defaultValue={query}
            />
          </form>
          {canExport ? (
            <a
              className="ghost-button"
              href="/api/export/admins"
              title="تصدير CSV"
            >
              <Download size={16} strokeWidth={2} />
              تصدير CSV
            </a>
          ) : null}
          {canCreate ? (
            <Link className="button" href="/admins/new">
              <Plus size={18} strokeWidth={2} />
              إضافة إدارية
            </Link>
          ) : null}
        </div>
      </header>

      <section className="grid stats-grid" aria-label="ملخص الإداريات">
        <article className="card stat-card">
          <div className="stat-header">
            <span>إجمالي النتائج</span>
            <span className="icon-badge">
              <Users size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{adminsList.length}</div>
          <p className="stat-note">{query ? `بحث: ${query}` : "كل الإداريات"}</p>
        </article>

        <article className="card stat-card tone-mint">
          <div className="stat-header">
            <span>الأقسام</span>
            <span className="icon-badge tone-mint">
              <Building2 size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{departments.size}</div>
          <p className="stat-note">قسم ممثل في النتائج</p>
        </article>

        <article className="card stat-card tone-rose">
          <div className="stat-header">
            <span>المسميات الوظيفية</span>
            <span className="icon-badge tone-rose">
              <Search size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{titles.size}</div>
          <p className="stat-note">مسميات مختلفة</p>
        </article>

        <article className="card stat-card">
          <div className="stat-header">
            <span>إضافة سريعة</span>
            <span className="icon-badge">
              <Plus size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">إدارية</div>
          <p className="stat-note">
            <Link href="/admins/new" className="quick-link">
              فتح نموذج التسجيل
            </Link>
          </p>
        </article>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>السجلات</h2>
          <span className="pill">قاعدة بيانات حية</span>
        </div>

        {adminsList.length === 0 ? (
          <div className="empty-state">
            <h3>لا توجد إداريات مطابقة</h3>
            <p>
              {query
                ? "لم يتم العثور على نتائج لبحثك."
                : "لم يتم تسجيل أي إدارية بعد. ابدئي بإضافة أول إدارية."}
            </p>
            <Link className="button" href="/admins/new">
              <Plus size={18} strokeWidth={2} />
              إضافة إدارية
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>المسمى الوظيفي</th>
                  <th>القسم</th>
                  <th>سنوات الخدمة</th>
                  <th>الجوال</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {adminsList.map((admin) => (
                  <tr key={admin.id}>
                    <td>
                      <Link className="row-link" href={`/admins/${admin.id}`}>
                        {admin.fullName}
                      </Link>
                    </td>
                    <td>{admin.jobTitle}</td>
                    <td>{admin.department}</td>
                    <td>{admin.yearsOfService}</td>
                    <td className="mono">{admin.phone ?? "—"}</td>
                    <td>
                      <span
                        className={`status ${
                          admin.status === "active" ? "good" : "warn"
                        }`}
                      >
                        {statusLabels[admin.status] ?? admin.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
