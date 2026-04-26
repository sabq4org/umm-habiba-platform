import { BookMarked, GraduationCap, Plus, Sigma, UserRound } from "lucide-react";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type SearchParams = { grade?: string };

const statusLabels: Record<string, string> = {
  active: "نشطة",
  archived: "مؤرشفة",
};

const grades = ["الأول متوسط", "الثاني متوسط", "الثالث متوسط"];

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("subjects.read");
  const { grade } = await searchParams;
  const gradeFilter = (grade ?? "").trim();

  const baseQuery = db
    .select({
      id: schema.subjects.id,
      name: schema.subjects.name,
      code: schema.subjects.code,
      grade: schema.subjects.grade,
      weeklyPeriods: schema.subjects.weeklyPeriods,
      status: schema.subjects.status,
      teacherId: schema.subjects.teacherId,
      teacherName: schema.teachers.fullName,
      teacherSpecialty: schema.teachers.specialty,
    })
    .from(schema.subjects)
    .leftJoin(schema.teachers, eq(schema.subjects.teacherId, schema.teachers.id))
    .orderBy(asc(schema.subjects.grade), asc(schema.subjects.name));

  const subjectsList = gradeFilter
    ? await baseQuery.where(eq(schema.subjects.grade, gradeFilter))
    : await baseQuery;

  const totalPeriods = subjectsList.reduce(
    (sum, item) => sum + item.weeklyPeriods,
    0,
  );
  const assignedCount = subjectsList.filter((item) => item.teacherId).length;
  const unassignedCount = subjectsList.length - assignedCount;
  const gradesPresent = new Set(subjectsList.map((item) => item.grade));

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <BookMarked size={14} strokeWidth={2} />
            وحدة المواد الدراسية
          </p>
          <h2 className="page-title">المواد الدراسية</h2>
          <p className="page-subtitle">
            عرض المواد المعتمدة لكل صف، الحصص الأسبوعية، والمعلمات المسؤولات. هذه
            البيانات هي أساس الجداول الدراسية والدرجات.
          </p>
        </div>

        <div className="top-actions">
          <form className="search-form" role="search">
            <select
              className="search"
              name="grade"
              aria-label="تصفية حسب الصف"
              defaultValue={gradeFilter}
            >
              <option value="">كل الصفوف</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <button className="ghost-link" type="submit">
              تطبيق
            </button>
          </form>
          <Link className="button" href="/subjects/new">
            <Plus size={18} strokeWidth={2} />
            إضافة مادة
          </Link>
        </div>
      </header>

      <section className="grid stats-grid" aria-label="ملخص المواد">
        <article className="card stat-card">
          <div className="stat-header">
            <span>عدد المواد</span>
            <span className="icon-badge">
              <BookMarked size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{subjectsList.length}</div>
          <p className="stat-note">{gradeFilter || "جميع الصفوف"}</p>
        </article>

        <article className="card stat-card tone-mint">
          <div className="stat-header">
            <span>إجمالي الحصص الأسبوعية</span>
            <span className="icon-badge tone-mint">
              <Sigma size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{totalPeriods}</div>
          <p className="stat-note">حصة في الأسبوع</p>
        </article>

        <article className="card stat-card tone-rose">
          <div className="stat-header">
            <span>الصفوف الممثلة</span>
            <span className="icon-badge tone-rose">
              <GraduationCap size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{gradesPresent.size}</div>
          <p className="stat-note">صف ضمن النتائج</p>
        </article>

        <article className="card stat-card">
          <div className="stat-header">
            <span>التغطية</span>
            <span className="icon-badge">
              <UserRound size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{assignedCount}</div>
          <p className="stat-note">
            {unassignedCount > 0
              ? `${unassignedCount} مادة بدون معلمة معينة`
              : "كل المواد لها معلمة"}
          </p>
        </article>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>قائمة المواد</h2>
          <span className="pill">قاعدة بيانات حية</span>
        </div>

        {subjectsList.length === 0 ? (
          <div className="empty-state">
            <h3>لا توجد مواد مطابقة</h3>
            <p>
              {gradeFilter
                ? "لم يتم تسجيل أي مادة لهذا الصف. ابدئي بإضافة مادة."
                : "لم يتم تسجيل أي مادة بعد. ابدئي بإضافة المواد المعتمدة."}
            </p>
            <Link className="button" href="/subjects/new">
              <Plus size={18} strokeWidth={2} />
              إضافة مادة
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>اسم المادة</th>
                  <th>الرمز</th>
                  <th>الصف</th>
                  <th>الحصص الأسبوعية</th>
                  <th>المعلمة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {subjectsList.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="row-link" href={`/subjects/${item.id}`}>
                        {item.name}
                      </Link>
                    </td>
                    <td className="mono">{item.code ?? "—"}</td>
                    <td>{item.grade}</td>
                    <td>{item.weeklyPeriods}</td>
                    <td>
                      {item.teacherName ? (
                        <Link
                          className="row-link"
                          href={`/teachers/${item.teacherId}`}
                        >
                          {item.teacherName}
                        </Link>
                      ) : (
                        <span className="muted">غير معينة</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status ${
                          item.status === "active" ? "good" : "warn"
                        }`}
                      >
                        {statusLabels[item.status] ?? item.status}
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
