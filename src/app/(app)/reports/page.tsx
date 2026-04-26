import Link from "next/link";
import { count, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { bandFor } from "../grades/constants";

export const dynamic = "force-dynamic";

function pct(value: number | null, fallback = 0): number {
  if (value === null || Number.isNaN(value)) return fallback;
  return Math.round(value * 10) / 10;
}

export default async function ReportsPage() {
  await requirePermission("reports.read");
  const [studentsCount] = await db
    .select({ value: count() })
    .from(schema.students);
  const [teachersCount] = await db
    .select({ value: count() })
    .from(schema.teachers);
  const [classesCount] = await db
    .select({ value: count() })
    .from(schema.classes);
  const [subjectsCount] = await db
    .select({ value: count() })
    .from(schema.subjects);

  const attendanceAgg = await db
    .select({
      total: sql<number>`count(*)::int`,
      present: sql<number>`count(*) filter (where ${schema.attendanceRecords.status} = 'present')::int`,
      absent: sql<number>`count(*) filter (where ${schema.attendanceRecords.status} = 'absent')::int`,
      late: sql<number>`count(*) filter (where ${schema.attendanceRecords.status} = 'late')::int`,
      excused: sql<number>`count(*) filter (where ${schema.attendanceRecords.status} = 'excused')::int`,
    })
    .from(schema.attendanceRecords);

  const att = attendanceAgg[0] ?? { total: 0, present: 0, absent: 0, late: 0, excused: 0 };
  const attendanceRate =
    att.total > 0 ? Math.round((att.present / att.total) * 1000) / 10 : 0;

  const gradesOverall = await db
    .select({
      avgPct: sql<number>`avg(${schema.studentGrades.score}::float / nullif(${schema.assessments.maxScore}, 0)) * 100`,
      total: sql<number>`count(*)::int`,
    })
    .from(schema.studentGrades)
    .innerJoin(
      schema.assessments,
      eq(schema.studentGrades.assessmentId, schema.assessments.id),
    );

  const overallAvg = pct(gradesOverall[0]?.avgPct ?? null);
  const totalGrades = gradesOverall[0]?.total ?? 0;

  const byClassAttendance = await db
    .select({
      classId: schema.classes.id,
      grade: schema.classes.grade,
      section: schema.classes.section,
      total: sql<number>`count(${schema.attendanceRecords.id})::int`,
      absent: sql<number>`count(*) filter (where ${schema.attendanceRecords.status} = 'absent')::int`,
      late: sql<number>`count(*) filter (where ${schema.attendanceRecords.status} = 'late')::int`,
      present: sql<number>`count(*) filter (where ${schema.attendanceRecords.status} = 'present')::int`,
    })
    .from(schema.classes)
    .leftJoin(
      schema.scheduleEntries,
      eq(schema.scheduleEntries.classId, schema.classes.id),
    )
    .leftJoin(
      schema.attendanceRecords,
      eq(schema.attendanceRecords.scheduleEntryId, schema.scheduleEntries.id),
    )
    .groupBy(schema.classes.id, schema.classes.grade, schema.classes.section)
    .orderBy(schema.classes.grade, schema.classes.section);

  const byClassGrades = await db
    .select({
      classId: schema.classes.id,
      grade: schema.classes.grade,
      section: schema.classes.section,
      avgPct: sql<number>`avg(${schema.studentGrades.score}::float / nullif(${schema.assessments.maxScore}, 0)) * 100`,
      total: sql<number>`count(${schema.studentGrades.id})::int`,
    })
    .from(schema.classes)
    .leftJoin(
      schema.assessments,
      eq(schema.assessments.classId, schema.classes.id),
    )
    .leftJoin(
      schema.studentGrades,
      eq(schema.studentGrades.assessmentId, schema.assessments.id),
    )
    .groupBy(schema.classes.id, schema.classes.grade, schema.classes.section);

  const topStudents = await db
    .select({
      studentId: schema.students.id,
      name: schema.students.fullName,
      grade: schema.students.grade,
      section: schema.students.section,
      avgPct: sql<number>`avg(${schema.studentGrades.score}::float / nullif(${schema.assessments.maxScore}, 0)) * 100`,
      total: sql<number>`count(${schema.studentGrades.id})::int`,
    })
    .from(schema.students)
    .leftJoin(
      schema.studentGrades,
      eq(schema.studentGrades.studentId, schema.students.id),
    )
    .leftJoin(
      schema.assessments,
      eq(schema.assessments.id, schema.studentGrades.assessmentId),
    )
    .groupBy(
      schema.students.id,
      schema.students.fullName,
      schema.students.grade,
      schema.students.section,
    )
    .having(
      sql`count(${schema.studentGrades.id}) > 0 and avg(${schema.studentGrades.score}::float / nullif(${schema.assessments.maxScore}, 0)) >= 0.8`,
    )
    .orderBy(
      desc(
        sql`avg(${schema.studentGrades.score}::float / nullif(${schema.assessments.maxScore}, 0))`,
      ),
    )
    .limit(8);

  const teacherLoad = await db
    .select({
      teacherId: schema.teachers.id,
      name: schema.teachers.fullName,
      specialty: schema.teachers.specialty,
      periods: sql<number>`count(${schema.scheduleEntries.id})::int`,
    })
    .from(schema.teachers)
    .leftJoin(
      schema.scheduleEntries,
      eq(schema.scheduleEntries.teacherId, schema.teachers.id),
    )
    .groupBy(
      schema.teachers.id,
      schema.teachers.fullName,
      schema.teachers.specialty,
    )
    .orderBy(desc(sql`count(${schema.scheduleEntries.id})`))
    .limit(8);

  const studentDistribution = await db
    .select({
      grade: schema.students.grade,
      total: sql<number>`count(*)::int`,
    })
    .from(schema.students)
    .groupBy(schema.students.grade)
    .orderBy(schema.students.grade);

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">التقارير التحليلية</span>
          <h1>نظرة شاملة على المنصة</h1>
          <p>
            مؤشرات الأداء، توزيعات الطالبات، نسب الحضور، ومتوسطات الدرجات في
            مكان واحد.
          </p>
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">الطالبات</span>
          <strong className="stat-value">{studentsCount?.value ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">المعلمات</span>
          <strong className="stat-value">{teachersCount?.value ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">الفصول</span>
          <strong className="stat-value">{classesCount?.value ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">المواد</span>
          <strong className="stat-value">{subjectsCount?.value ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">نسبة الحضور</span>
          <strong className="stat-value">{attendanceRate}%</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">المتوسط العام</span>
          <strong className="stat-value">{overallAvg}%</strong>
          <span className="muted-text small">{totalGrades} درجة مسجلة</span>
        </div>
      </section>

      <section className="two-col">
        <div className="card">
          <div className="card-head">
            <h3>توزيع الحضور حسب الحالة</h3>
          </div>
          <BarRow label="حاضرات" value={att.present} total={att.total} tone="ok" />
          <BarRow label="متأخرات" value={att.late} total={att.total} tone="amber" />
          <BarRow label="غياب بعذر" value={att.excused} total={att.total} tone="muted" />
          <BarRow label="غائبات" value={att.absent} total={att.total} tone="danger" />
          <p className="muted-text small">
            إجمالي السجلات: <strong>{att.total}</strong>
          </p>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>توزيع الطالبات حسب الصف</h3>
          </div>
          {studentDistribution.length === 0 ? (
            <p className="muted-text">لا توجد طالبات.</p>
          ) : (
            studentDistribution.map((row) => {
              const total = studentsCount?.value ?? 0;
              return (
                <BarRow
                  key={row.grade}
                  label={row.grade}
                  value={row.total}
                  total={total}
                  tone="ok"
                />
              );
            })
          )}
        </div>
      </section>

      <section className="two-col">
        <div className="card">
          <div className="card-head">
            <h3>أداء الفصول (متوسط الدرجات)</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الفصل</th>
                  <th>المتوسط %</th>
                  <th>التقدير</th>
                  <th>عدد الدرجات</th>
                </tr>
              </thead>
              <tbody>
                {byClassGrades.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted-text">لا توجد بيانات.</td>
                  </tr>
                ) : (
                  byClassGrades.map((row) => {
                    const avg = row.total > 0 ? pct(row.avgPct ?? null) : null;
                    const band = bandFor(avg);
                    return (
                      <tr key={row.classId}>
                        <td>
                          <Link href={`/classes/${row.classId}`}>
                            {row.grade} — {row.section}
                          </Link>
                        </td>
                        <td>{avg !== null ? `${avg}%` : "—"}</td>
                        <td>
                          <span className={`status-chip status-${band.tone}`}>
                            {band.label}
                          </span>
                        </td>
                        <td>{row.total}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>الفصول الأعلى غياباً</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الفصل</th>
                  <th>غياب</th>
                  <th>تأخير</th>
                  <th>السجلات</th>
                </tr>
              </thead>
              <tbody>
                {byClassAttendance
                  .filter((c) => c.total > 0)
                  .sort((a, b) => b.absent - a.absent)
                  .slice(0, 6)
                  .map((c) => (
                    <tr key={c.classId}>
                      <td>
                        <Link href={`/attendance/class/${c.classId}`}>
                          {c.grade} — {c.section}
                        </Link>
                      </td>
                      <td>{c.absent}</td>
                      <td>{c.late}</td>
                      <td>{c.total}</td>
                    </tr>
                  ))}
                {byClassAttendance.filter((c) => c.total > 0).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted-text">لا توجد سجلات بعد.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="two-col">
        <div className="card">
          <div className="card-head">
            <h3>أوائل الطالبات</h3>
            <span className="small status-muted">
              المتوسط 80% فأعلى (جيد جدًا / ممتاز)
            </span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الطالبة</th>
                  <th>الصف</th>
                  <th>المتوسط</th>
                  <th>التقدير</th>
                </tr>
              </thead>
              <tbody>
                {topStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted-text">
                      لا توجد طالبات ضمن مستوى الأوائل حالياً.
                    </td>
                  </tr>
                ) : (
                  topStudents.map((s) => {
                    const avg = pct(s.avgPct ?? null);
                    const band = bandFor(avg);
                    return (
                      <tr key={s.studentId}>
                        <td>
                          <Link href={`/students/${s.studentId}`}>{s.name}</Link>
                        </td>
                        <td>{s.grade} — {s.section}</td>
                        <td>{avg}%</td>
                        <td>
                          <span className={`status-chip status-${band.tone}`}>
                            {band.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>الأنصبة الأسبوعية للمعلمات</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>المعلمة</th>
                  <th>التخصص</th>
                  <th>الحصص</th>
                </tr>
              </thead>
              <tbody>
                {teacherLoad.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted-text">لا توجد بيانات.</td>
                  </tr>
                ) : (
                  teacherLoad.map((t) => (
                    <tr key={t.teacherId}>
                      <td>
                        <Link href={`/teachers/${t.teacherId}`}>{t.name}</Link>
                      </td>
                      <td>{t.specialty}</td>
                      <td>
                        <strong>{t.periods}</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

function BarRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "ok" | "amber" | "danger" | "muted";
}) {
  const ratio = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="bar-row">
      <div className="bar-row-head">
        <span>{label}</span>
        <span className="muted-text">
          {value} ({ratio}%)
        </span>
      </div>
      <div className="bar-track">
        <div
          className={`bar-fill bar-${tone}`}
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}
