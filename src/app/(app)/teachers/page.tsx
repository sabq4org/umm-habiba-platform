import { BookOpen, Download, Plus, Search, UserRound, Users } from "lucide-react";
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

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requirePermission("teachers.read");
  const canExport = can(session.role, "export.run");
  const canCreate = session.role === "admin" || session.role === "staff";
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const baseQuery = db
    .select()
    .from(schema.teachers)
    .orderBy(asc(schema.teachers.fullName));

  const teachersList = query
    ? await baseQuery.where(
        or(
          ilike(schema.teachers.fullName, `%${query}%`),
          ilike(schema.teachers.nationalId, `%${query}%`),
          ilike(schema.teachers.specialty, `%${query}%`),
          ilike(schema.teachers.subjects, `%${query}%`),
        ),
      )
    : await baseQuery;

  const specialties = new Set(teachersList.map((teacher) => teacher.specialty));
  const totalLoad = teachersList.reduce((sum, teacher) => sum + (teacher.weeklyLoad ?? 0), 0);

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <UserRound size={14} strokeWidth={2} />
            وحدة المعلمات
          </p>
          <h2 className="page-title">قائمة المعلمات</h2>
          <p className="page-subtitle">
            عرض ملفات المعلمات في المدرسة، التخصصات، النصاب الأسبوعي، والمواد المسندة. يمكن
            البحث بالاسم، الهوية، التخصص، أو المادة.
          </p>
        </div>

        <div className="top-actions">
          <form className="search-form" role="search">
            <input
              className="search"
              aria-label="بحث في المعلمات"
              placeholder="بحث بالاسم أو التخصص"
              name="q"
              defaultValue={query}
            />
          </form>
          {canExport ? (
            <a
              className="ghost-button"
              href="/api/export/teachers"
              title="تصدير CSV"
            >
              <Download size={16} strokeWidth={2} />
              تصدير CSV
            </a>
          ) : null}
          {canCreate ? (
            <Link className="button" href="/teachers/new">
              <Plus size={18} strokeWidth={2} />
              إضافة معلمة
            </Link>
          ) : null}
        </div>
      </header>

      <section className="grid stats-grid" aria-label="ملخص المعلمات">
        <article className="card stat-card">
          <div className="stat-header">
            <span>إجمالي النتائج</span>
            <span className="icon-badge">
              <Users size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{teachersList.length}</div>
          <p className="stat-note">{query ? `بحث: ${query}` : "كل المعلمات"}</p>
        </article>

        <article className="card stat-card tone-mint">
          <div className="stat-header">
            <span>التخصصات</span>
            <span className="icon-badge tone-mint">
              <BookOpen size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{specialties.size}</div>
          <p className="stat-note">تخصصات ممثلة في النتائج</p>
        </article>

        <article className="card stat-card tone-rose">
          <div className="stat-header">
            <span>إجمالي النصاب</span>
            <span className="icon-badge tone-rose">
              <Search size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{totalLoad}</div>
          <p className="stat-note">حصة أسبوعية مجتمعة</p>
        </article>

        <article className="card stat-card">
          <div className="stat-header">
            <span>إضافة سريعة</span>
            <span className="icon-badge">
              <Plus size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">معلمة</div>
          <p className="stat-note">
            <Link href="/teachers/new" className="quick-link">
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

        {teachersList.length === 0 ? (
          <div className="empty-state">
            <h3>لا توجد معلمات مطابقة</h3>
            <p>
              {query
                ? "لم يتم العثور على نتائج لبحثك."
                : "لم يتم تسجيل أي معلمة بعد. ابدئي بإضافة أول معلمة."}
            </p>
            <Link className="button" href="/teachers/new">
              <Plus size={18} strokeWidth={2} />
              إضافة معلمة
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>التخصص</th>
                  <th>المواد</th>
                  <th>النصاب</th>
                  <th>سنوات الخدمة</th>
                  <th>الجوال</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {teachersList.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <Link className="row-link" href={`/teachers/${teacher.id}`}>
                        {teacher.fullName}
                      </Link>
                    </td>
                    <td>{teacher.specialty}</td>
                    <td>{teacher.subjects ?? "—"}</td>
                    <td>{teacher.weeklyLoad}</td>
                    <td>{teacher.yearsOfService}</td>
                    <td className="mono">{teacher.phone ?? "—"}</td>
                    <td>
                      <span
                        className={`status ${
                          teacher.status === "active" ? "good" : "warn"
                        }`}
                      >
                        {statusLabels[teacher.status] ?? teacher.status}
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
