import { BookOpen, CalendarDays, GraduationCap, Plus, Users } from "lucide-react";
import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type SearchParams = { year?: string };

const statusLabels: Record<string, string> = {
  active: "نشط",
  archived: "مؤرشف",
};

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("classes.read");
  const { year } = await searchParams;
  const yearFilter = (year ?? "").trim();

  const baseQuery = db
    .select({
      id: schema.classes.id,
      grade: schema.classes.grade,
      section: schema.classes.section,
      academicYear: schema.classes.academicYear,
      capacity: schema.classes.capacity,
      room: schema.classes.room,
      status: schema.classes.status,
      homeroomTeacherId: schema.classes.homeroomTeacherId,
      teacherName: schema.teachers.fullName,
    })
    .from(schema.classes)
    .leftJoin(
      schema.teachers,
      eq(schema.classes.homeroomTeacherId, schema.teachers.id),
    )
    .orderBy(asc(schema.classes.grade), asc(schema.classes.section));

  const classesList = yearFilter
    ? await baseQuery.where(eq(schema.classes.academicYear, yearFilter))
    : await baseQuery;

  const studentCounts = await db
    .select({
      grade: schema.students.grade,
      section: schema.students.section,
      total: count(schema.students.id),
    })
    .from(schema.students)
    .groupBy(schema.students.grade, schema.students.section);

  const studentCountMap = new Map<string, number>();
  for (const row of studentCounts) {
    studentCountMap.set(`${row.grade}__${row.section}`, Number(row.total));
  }

  const allYears = await db
    .selectDistinct({ academicYear: schema.classes.academicYear })
    .from(schema.classes)
    .orderBy(asc(schema.classes.academicYear));

  const totalCapacity = classesList.reduce((sum, item) => sum + item.capacity, 0);
  const totalStudents = classesList.reduce(
    (sum, item) =>
      sum + (studentCountMap.get(`${item.grade}__${item.section}`) ?? 0),
    0,
  );
  const utilizationPct =
    totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <BookOpen size={14} strokeWidth={2} />
            وحدة الفصول والشعب
          </p>
          <h2 className="page-title">الفصول الدراسية</h2>
          <p className="page-subtitle">
            عرض الشعب الدراسية الحالية، رائدات الفصول، السعة، وعدد الطالبات
            المسجلات في كل شعبة. يمكنك التصفية بالعام الدراسي.
          </p>
        </div>

        <div className="top-actions">
          <form className="search-form" role="search">
            <select
              className="search"
              name="year"
              aria-label="تصفية حسب العام"
              defaultValue={yearFilter}
            >
              <option value="">كل الأعوام</option>
              {allYears.map((row) => (
                <option key={row.academicYear} value={row.academicYear}>
                  {row.academicYear}
                </option>
              ))}
            </select>
            <button className="ghost-link" type="submit">
              تطبيق
            </button>
          </form>
          <Link className="button" href="/classes/new">
            <Plus size={18} strokeWidth={2} />
            إضافة فصل
          </Link>
        </div>
      </header>

      <section className="grid stats-grid" aria-label="ملخص الفصول">
        <article className="card stat-card">
          <div className="stat-header">
            <span>عدد الفصول</span>
            <span className="icon-badge">
              <BookOpen size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{classesList.length}</div>
          <p className="stat-note">{yearFilter || "جميع الأعوام"}</p>
        </article>

        <article className="card stat-card tone-mint">
          <div className="stat-header">
            <span>الطالبات في الفصول</span>
            <span className="icon-badge tone-mint">
              <GraduationCap size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{totalStudents}</div>
          <p className="stat-note">من إجمالي السعة {totalCapacity}</p>
        </article>

        <article className="card stat-card tone-rose">
          <div className="stat-header">
            <span>نسبة الاستيعاب</span>
            <span className="icon-badge tone-rose">
              <Users size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{utilizationPct}%</div>
          <p className="stat-note">طالبات مسجلات / السعة الكلية</p>
        </article>

        <article className="card stat-card">
          <div className="stat-header">
            <span>الأعوام المسجلة</span>
            <span className="icon-badge">
              <CalendarDays size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{allYears.length}</div>
          <p className="stat-note">عام دراسي مختلف</p>
        </article>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>قائمة الفصول</h2>
          <span className="pill">قاعدة بيانات حية</span>
        </div>

        {classesList.length === 0 ? (
          <div className="empty-state">
            <h3>لا توجد فصول مطابقة</h3>
            <p>
              {yearFilter
                ? "لا فصول لهذا العام بعد. ابدئي بإضافة أول فصل."
                : "لم يتم إضافة أي فصل بعد. ابدئي بإضافة أول فصل."}
            </p>
            <Link className="button" href="/classes/new">
              <Plus size={18} strokeWidth={2} />
              إضافة فصل
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الصف</th>
                  <th>الشعبة</th>
                  <th>العام</th>
                  <th>الغرفة</th>
                  <th>السعة</th>
                  <th>الطالبات</th>
                  <th>رائدة الفصل</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {classesList.map((item) => {
                  const enrolled =
                    studentCountMap.get(`${item.grade}__${item.section}`) ?? 0;
                  const fillPct = item.capacity
                    ? Math.round((enrolled / item.capacity) * 100)
                    : 0;
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link className="row-link" href={`/classes/${item.id}`}>
                          {item.grade}
                        </Link>
                      </td>
                      <td className="mono">{item.section}</td>
                      <td>{item.academicYear}</td>
                      <td className="mono">{item.room ?? "—"}</td>
                      <td>{item.capacity}</td>
                      <td>
                        {enrolled} <span className="muted">({fillPct}%)</span>
                      </td>
                      <td>{item.teacherName ?? "—"}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
