import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { guardianCanAccessStudent, resolveSession } from "@/lib/scope";
import {
  formatArabicDate,
  statusColor,
  statusLabel,
} from "../../constants";

export const dynamic = "force-dynamic";

export default async function StudentAttendancePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requirePermission("attendance.read");
  const { studentId } = await params;
  const session = await resolveSession();
  if (session && !guardianCanAccessStudent(session, studentId)) {
    redirect("/forbidden");
  }

  const [student] = await db
    .select({
      id: schema.students.id,
      fullName: schema.students.fullName,
      nationalId: schema.students.nationalId,
      grade: schema.students.grade,
      section: schema.students.section,
    })
    .from(schema.students)
    .where(eq(schema.students.id, studentId))
    .limit(1);

  if (!student) return notFound();

  const [
    breakdown,
    [totalRow],
    historyRows,
  ] = await Promise.all([
    db
      .select({
        status: schema.attendanceRecords.status,
        total: count(schema.attendanceRecords.id),
      })
      .from(schema.attendanceRecords)
      .where(eq(schema.attendanceRecords.studentId, studentId))
      .groupBy(schema.attendanceRecords.status),
    db
      .select({ total: count(schema.attendanceRecords.id) })
      .from(schema.attendanceRecords)
      .where(eq(schema.attendanceRecords.studentId, studentId)),
    db
      .select({
        id: schema.attendanceRecords.id,
        date: schema.attendanceRecords.attendanceDate,
        status: schema.attendanceRecords.status,
        notes: schema.attendanceRecords.notes,
        period: schema.scheduleEntries.period,
        dayOfWeek: schema.scheduleEntries.dayOfWeek,
        subjectName: schema.subjects.name,
        teacherName: schema.teachers.fullName,
        classId: schema.scheduleEntries.classId,
      })
      .from(schema.attendanceRecords)
      .innerJoin(
        schema.scheduleEntries,
        eq(schema.attendanceRecords.scheduleEntryId, schema.scheduleEntries.id),
      )
      .innerJoin(
        schema.subjects,
        eq(schema.scheduleEntries.subjectId, schema.subjects.id),
      )
      .leftJoin(
        schema.teachers,
        eq(schema.scheduleEntries.teacherId, schema.teachers.id),
      )
      .where(eq(schema.attendanceRecords.studentId, studentId))
      .orderBy(
        desc(schema.attendanceRecords.attendanceDate),
        desc(schema.scheduleEntries.period),
      )
      .limit(60),
  ]);

  const breakdownMap = new Map(
    breakdown.map((row) => [row.status, Number(row.total)]),
  );
  const total = Number(totalRow?.total ?? 0);
  const present = breakdownMap.get("present") ?? 0;
  const absent = breakdownMap.get("absent") ?? 0;
  const late = breakdownMap.get("late") ?? 0;
  const excused = breakdownMap.get("excused") ?? 0;
  const presencePct = total > 0 ? Math.round((present / total) * 100) : 0;

  // group history rows by date for cleaner display
  const grouped = new Map<string, typeof historyRows>();
  for (const row of historyRows) {
    if (!grouped.has(row.date)) grouped.set(row.date, []);
    grouped.get(row.date)!.push(row);
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <ClipboardList size={14} strokeWidth={2} />
            سجل حضور الطالبة
          </p>
          <h2 className="page-title">{student.fullName}</h2>
          <p className="page-subtitle">
            {student.grade} — {student.section} · رقم الهوية {student.nationalId}
          </p>
        </div>
        <div className="top-actions">
          <Link
            className="ghost-button"
            href={`/students/${student.id}`}
          >
            <GraduationCap size={16} strokeWidth={2} />
            ملف الطالبة
          </Link>
          <Link className="ghost-button" href="/attendance">
            <ArrowRight size={16} strokeWidth={2} />
            رجوع للحضور
          </Link>
        </div>
      </header>

      <section className="grid stats-grid">
        <article className="card stat-card tone-mint">
          <div className="stat-header">
            <span>نسبة الحضور</span>
            <span className="icon-badge tone-mint">
              <CheckCircle2 size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{presencePct}%</div>
          <p className="stat-note">
            {present} حصة حاضرة من أصل {total}
          </p>
        </article>
        <article className="card stat-card tone-rose">
          <div className="stat-header">
            <span>غياب بدون عذر</span>
            <span className="icon-badge tone-rose">
              <AlertTriangle size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{absent}</div>
          <p className="stat-note">يستوجب التواصل مع ولي الأمر</p>
        </article>
        <article className="card stat-card">
          <div className="stat-header">
            <span>تأخر</span>
            <span className="icon-badge">
              <Clock size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{late}</div>
          <p className="stat-note">{excused} غياب بعذر مقبول</p>
        </article>
      </section>

      <article className="card">
        <div className="section-heading">
          <h2>آخر السجلات</h2>
          <span className="pill">{historyRows.length} حصة</span>
        </div>

        {historyRows.length === 0 ? (
          <div className="empty-state">
            <h3>لا توجد سجلات حضور بعد</h3>
            <p>سيظهر هنا سجل الطالبة فور بدء تسجيل الحصص.</p>
          </div>
        ) : (
          <div className="timeline-list">
            {Array.from(grouped.entries()).map(([date, rows]) => (
              <div key={date} className="timeline-day">
                <div className="timeline-day-header">
                  <strong>{formatArabicDate(date)}</strong>
                  <Link
                    href={`/attendance/class/${rows[0].classId}?date=${date}`}
                    className="ghost-link"
                  >
                    عرض جدول الفصل
                  </Link>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الحصة</th>
                      <th>المادة</th>
                      <th>المعلمة</th>
                      <th>الحالة</th>
                      <th>ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <span className="pill">حصة {row.period}</span>
                        </td>
                        <td>{row.subjectName}</td>
                        <td>{row.teacherName ?? "—"}</td>
                        <td>
                          <span
                            className={`pill tone-${statusColor(row.status)}`}
                          >
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td>{row.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </article>
    </>
  );
}
