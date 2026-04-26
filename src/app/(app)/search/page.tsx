import Link from "next/link";
import { ilike, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type Search = Promise<{ q?: string }>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  await requirePermission("search.read");
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const like = `%${q}%`;

  if (!q) {
    return (
      <>
        <header className="page-header">
          <div>
            <span className="eyebrow">بحث</span>
            <h1>بحث موحّد</h1>
            <p>ابحثي في الطالبات، المعلمات، الإداريات، الفصول، المواد، الإعلانات.</p>
          </div>
        </header>
        <section className="card">
          <p className="muted-text">
            استخدمي شريط البحث في الأعلى أو افتحي البحث من الصفحة الحالية.
          </p>
        </section>
      </>
    );
  }

  const [students, teachers, admins, classes, subjects, announcements] =
    await Promise.all([
      db
        .select({
          id: schema.students.id,
          name: schema.students.fullName,
          grade: schema.students.grade,
          section: schema.students.section,
          nationalId: schema.students.nationalId,
        })
        .from(schema.students)
        .where(
          or(
            ilike(schema.students.fullName, like),
            ilike(schema.students.nationalId, like),
            ilike(schema.students.guardianName, like),
            ilike(schema.students.guardianPhone, like),
          ),
        )
        .limit(15),
      db
        .select({
          id: schema.teachers.id,
          name: schema.teachers.fullName,
          specialty: schema.teachers.specialty,
          email: schema.teachers.email,
        })
        .from(schema.teachers)
        .where(
          or(
            ilike(schema.teachers.fullName, like),
            ilike(schema.teachers.specialty, like),
            ilike(schema.teachers.email, like),
            ilike(schema.teachers.nationalId, like),
          ),
        )
        .limit(15),
      db
        .select({
          id: schema.admins.id,
          name: schema.admins.fullName,
          jobTitle: schema.admins.jobTitle,
          department: schema.admins.department,
        })
        .from(schema.admins)
        .where(
          or(
            ilike(schema.admins.fullName, like),
            ilike(schema.admins.jobTitle, like),
            ilike(schema.admins.department, like),
          ),
        )
        .limit(15),
      db
        .select({
          id: schema.classes.id,
          grade: schema.classes.grade,
          section: schema.classes.section,
          academicYear: schema.classes.academicYear,
          room: schema.classes.room,
        })
        .from(schema.classes)
        .where(
          or(
            ilike(schema.classes.grade, like),
            ilike(schema.classes.section, like),
            ilike(schema.classes.room, like),
          ),
        )
        .limit(15),
      db
        .select({
          id: schema.subjects.id,
          name: schema.subjects.name,
          code: schema.subjects.code,
          grade: schema.subjects.grade,
        })
        .from(schema.subjects)
        .where(
          or(
            ilike(schema.subjects.name, like),
            ilike(schema.subjects.code, like),
            ilike(schema.subjects.grade, like),
          ),
        )
        .limit(15),
      db
        .select({
          id: schema.announcements.id,
          title: schema.announcements.title,
          audience: schema.announcements.audience,
        })
        .from(schema.announcements)
        .where(
          or(
            ilike(schema.announcements.title, like),
            ilike(schema.announcements.body, like),
          ),
        )
        .limit(15),
    ]);

  const totalResults =
    students.length +
    teachers.length +
    admins.length +
    classes.length +
    subjects.length +
    announcements.length;

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">بحث</span>
          <h1>نتائج البحث عن «{q}»</h1>
          <p>
            عُثر على <strong>{totalResults}</strong> نتيجة في كل وحدات النظام.
          </p>
        </div>
        <form action="/search" method="get" className="search-bar-inline">
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="ابحثي عن..."
          />
          <button type="submit" className="primary-button">
            بحث
          </button>
        </form>
      </header>

      <ResultBlock title={`الطالبات (${students.length})`}>
        {students.length === 0 ? (
          <Empty />
        ) : (
          students.map((s) => (
            <Link key={s.id} href={`/students/${s.id}`} className="result-row">
              <strong>{s.name}</strong>
              <span className="muted-text">
                {s.grade} — {s.section} · هوية {s.nationalId}
              </span>
            </Link>
          ))
        )}
      </ResultBlock>

      <ResultBlock title={`المعلمات (${teachers.length})`}>
        {teachers.length === 0 ? (
          <Empty />
        ) : (
          teachers.map((t) => (
            <Link key={t.id} href={`/teachers/${t.id}`} className="result-row">
              <strong>{t.name}</strong>
              <span className="muted-text">
                {t.specialty}
                {t.email ? ` · ${t.email}` : ""}
              </span>
            </Link>
          ))
        )}
      </ResultBlock>

      <ResultBlock title={`الإداريات (${admins.length})`}>
        {admins.length === 0 ? (
          <Empty />
        ) : (
          admins.map((a) => (
            <Link key={a.id} href={`/admins/${a.id}`} className="result-row">
              <strong>{a.name}</strong>
              <span className="muted-text">
                {a.jobTitle} · {a.department}
              </span>
            </Link>
          ))
        )}
      </ResultBlock>

      <ResultBlock title={`الفصول (${classes.length})`}>
        {classes.length === 0 ? (
          <Empty />
        ) : (
          classes.map((c) => (
            <Link key={c.id} href={`/classes/${c.id}`} className="result-row">
              <strong>
                {c.grade} — {c.section}
              </strong>
              <span className="muted-text">
                {c.academicYear}
                {c.room ? ` · قاعة ${c.room}` : ""}
              </span>
            </Link>
          ))
        )}
      </ResultBlock>

      <ResultBlock title={`المواد (${subjects.length})`}>
        {subjects.length === 0 ? (
          <Empty />
        ) : (
          subjects.map((s) => (
            <Link key={s.id} href={`/subjects/${s.id}`} className="result-row">
              <strong>{s.name}</strong>
              <span className="muted-text">
                {s.grade}
                {s.code ? ` · ${s.code}` : ""}
              </span>
            </Link>
          ))
        )}
      </ResultBlock>

      <ResultBlock title={`الإعلانات (${announcements.length})`}>
        {announcements.length === 0 ? (
          <Empty />
        ) : (
          announcements.map((a) => (
            <Link
              key={a.id}
              href="/announcements"
              className="result-row"
            >
              <strong>{a.title}</strong>
              <span className="muted-text">{a.audience}</span>
            </Link>
          ))
        )}
      </ResultBlock>
    </>
  );
}

function Empty() {
  return <p className="muted-text">لا توجد نتائج.</p>;
}

function ResultBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-head">
        <h3>{title}</h3>
      </div>
      <div className="result-list">{children}</div>
    </section>
  );
}
