import { Download, GraduationCap, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, ilike, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { can, requirePermission } from "@/lib/permissions";
import {
  isUnrestricted,
  resolveSession,
  teacherStudentIds,
} from "@/lib/scope";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("students.read");
  const session = await resolveSession();

  if (session?.role === "guardian") {
    if (session.studentRecordId) {
      redirect(`/students/${session.studentRecordId}`);
    }
    redirect("/forbidden");
  }

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const baseQuery = db
    .select()
    .from(schema.students)
    .orderBy(asc(schema.students.fullName));

  let studentsList = query
    ? await baseQuery.where(
        or(
          ilike(schema.students.fullName, `%${query}%`),
          ilike(schema.students.nationalId, `%${query}%`),
          ilike(schema.students.section, `%${query}%`),
          ilike(schema.students.grade, `%${query}%`),
        ),
      )
    : await baseQuery;

  if (
    session &&
    !isUnrestricted(session.role) &&
    session.role === "teacher" &&
    session.teacherRecordId
  ) {
    const allowed = await teacherStudentIds(session.teacherRecordId);
    studentsList = studentsList.filter((s) => allowed.has(s.id));
  }

  const canCreate = session?.role === "admin" || session?.role === "staff";
  const canExport = can(session?.role, "export.run");

  const grades = new Set(studentsList.map((student) => student.grade));

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <GraduationCap size={14} strokeWidth={2} />
            وحدة الطالبات
          </p>
          <h2 className="page-title">قائمة الطالبات</h2>
          <p className="page-subtitle">
            عرض ملفات الطالبات المسجلات في المنصة، مع إمكانية البحث بالاسم أو رقم الهوية
            أو الصف والشعبة. البيانات متصلة بقاعدة Neon Postgres.
          </p>
        </div>

        <div className="top-actions">
          <form className="search-form" role="search">
            <input
              className="search"
              aria-label="بحث في الطالبات"
              placeholder="بحث بالاسم أو رقم الهوية أو الصف"
              name="q"
              defaultValue={query}
            />
          </form>
          {canExport ? (
            <a
              className="ghost-button"
              href="/api/export/students"
              title="تصدير CSV"
            >
              <Download size={16} strokeWidth={2} />
              تصدير CSV
            </a>
          ) : null}
          {canCreate ? (
            <Link className="button" href="/students/new">
              <Plus size={18} strokeWidth={2} />
              إضافة طالبة
            </Link>
          ) : null}
        </div>
      </header>

      <section className="grid stats-grid" aria-label="ملخص الطالبات">
        <article className="card stat-card">
          <div className="stat-header">
            <span>إجمالي النتائج</span>
            <span className="icon-badge">
              <Users size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{studentsList.length}</div>
          <p className="stat-note">{query ? `بحث: ${query}` : "كل الطالبات المسجلات"}</p>
        </article>

        <article className="card stat-card tone-mint">
          <div className="stat-header">
            <span>الصفوف الدراسية</span>
            <span className="icon-badge tone-mint">
              <GraduationCap size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{grades.size}</div>
          <p className="stat-note">صفوف ممثلة في النتائج</p>
        </article>

        <article className="card stat-card tone-rose">
          <div className="stat-header">
            <span>قيد المراجعة</span>
            <span className="icon-badge tone-rose">
              <Search size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">0</div>
          <p className="stat-note">طلبات تعديل بيانات لاحقا</p>
        </article>

        <article className="card stat-card">
          <div className="stat-header">
            <span>إضافة سريعة</span>
            <span className="icon-badge">
              <Plus size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">طالبة</div>
          <p className="stat-note">
            <Link href="/students/new" className="quick-link">
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

        {studentsList.length === 0 ? (
          <div className="empty-state">
            <h3>لا توجد طالبات مطابقة</h3>
            <p>
              {query
                ? "لم يتم العثور على نتائج لبحثك. جربي مصطلحا آخر أو أزيلي الفلتر."
                : "لم يتم تسجيل أي طالبة بعد."}
            </p>
            {canCreate ? (
              <Link className="button" href="/students/new">
                <Plus size={18} strokeWidth={2} />
                إضافة طالبة
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>رقم الهوية</th>
                  <th>الصف</th>
                  <th>الشعبة</th>
                  <th>ولي الأمر</th>
                  <th>الجوال</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {studentsList.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <Link className="row-link" href={`/students/${student.id}`}>
                        {student.fullName}
                      </Link>
                    </td>
                    <td className="mono">{student.nationalId}</td>
                    <td>{student.grade}</td>
                    <td>{student.section}</td>
                    <td>{student.guardianName ?? "—"}</td>
                    <td className="mono">{student.guardianPhone ?? "—"}</td>
                    <td>
                      <span
                        className={`status ${
                          student.status === "active" ? "good" : "warn"
                        }`}
                      >
                        {student.status === "active" ? "فعّالة" : student.status}
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
