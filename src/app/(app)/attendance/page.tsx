import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Download,
  TrendingDown,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { asc, count, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { can, requirePermission } from "@/lib/permissions";
import { isUnrestricted, resolveSession, teacherClassIds } from "@/lib/scope";
import { todayIso, formatArabicDate, statusLabel, statusColor } from "./constants";

export const dynamic = "force-dynamic";

export default async function AttendanceIndexPage() {
  await requirePermission("attendance.read");

  const session = await resolveSession();
  if (session?.role === "guardian") {
    if (session.studentRecordId) {
      redirect(`/attendance/student/${session.studentRecordId}`);
    }
    redirect("/forbidden");
  }

  let allowedClassIds: Set<string> | null = null;
  if (session?.role === "teacher" && session.teacherRecordId) {
    allowedClassIds = await teacherClassIds(session.teacherRecordId);
  }
  const isScoped = !!allowedClassIds && !isUnrestricted(session?.role ?? "");
  const today = todayIso();

  if (isScoped && allowedClassIds && allowedClassIds.size === 0) {
    return (
      <section className="card">
        <div className="empty-state">
          <h3>لا توجد فصول مسندة لكِ بعد</h3>
          <p>تواصلي مع الإدارة لإسناد جدول وحصص.</p>
        </div>
      </section>
    );
  }

  const classesQuery = db
    .select({
      id: schema.classes.id,
      grade: schema.classes.grade,
      section: schema.classes.section,
      academicYear: schema.classes.academicYear,
    })
    .from(schema.classes)
    .$dynamic();
  const classesQueryFiltered =
    isScoped && allowedClassIds
      ? classesQuery.where(inArray(schema.classes.id, [...allowedClassIds]))
      : classesQuery;

  const [
    classesList,
    [studentsTotalRow],
    [todayCountRow],
    statusBreakdown,
    recentByClass,
  ] = await Promise.all([
    classesQueryFiltered.orderBy(
      asc(schema.classes.grade),
      asc(schema.classes.section),
    ),
    db.select({ total: count(schema.students.id) }).from(schema.students),
    db
      .select({ total: count(schema.attendanceRecords.id) })
      .from(schema.attendanceRecords)
      .where(eq(schema.attendanceRecords.attendanceDate, today)),
    db
      .select({
        status: schema.attendanceRecords.status,
        total: count(schema.attendanceRecords.id),
      })
      .from(schema.attendanceRecords)
      .where(eq(schema.attendanceRecords.attendanceDate, today))
      .groupBy(schema.attendanceRecords.status),
    db
      .select({
        date: schema.attendanceRecords.attendanceDate,
        classId: schema.scheduleEntries.classId,
        absent: sql<number>`COUNT(*) FILTER (WHERE ${schema.attendanceRecords.status} = 'absent')`,
        late: sql<number>`COUNT(*) FILTER (WHERE ${schema.attendanceRecords.status} = 'late')`,
        total: count(schema.attendanceRecords.id),
      })
      .from(schema.attendanceRecords)
      .innerJoin(
        schema.scheduleEntries,
        eq(schema.attendanceRecords.scheduleEntryId, schema.scheduleEntries.id),
      )
      .groupBy(
        schema.attendanceRecords.attendanceDate,
        schema.scheduleEntries.classId,
      )
      .orderBy(desc(schema.attendanceRecords.attendanceDate))
      .limit(40),
  ]);

  const scopedClassIdSet =
    isScoped && allowedClassIds ? allowedClassIds : null;
  const recentByClassFiltered = scopedClassIdSet
    ? recentByClass.filter((r) => scopedClassIdSet.has(r.classId)).slice(0, 8)
    : recentByClass.slice(0, 8);

  const todayTotal = Number(todayCountRow?.total ?? 0);
  const studentsTotal = Number(studentsTotalRow?.total ?? 0);
  const breakdownMap = new Map(
    statusBreakdown.map((row) => [row.status, Number(row.total)]),
  );
  const presentToday = breakdownMap.get("present") ?? 0;
  const absentToday = breakdownMap.get("absent") ?? 0;
  const lateToday = breakdownMap.get("late") ?? 0;
  const excusedToday = breakdownMap.get("excused") ?? 0;
  const presencePct = todayTotal > 0
    ? Math.round((presentToday / todayTotal) * 100)
    : 0;

  const todayPeriodCounts = await db
    .select({
      classId: schema.scheduleEntries.classId,
      total: count(schema.attendanceRecords.id),
    })
    .from(schema.attendanceRecords)
    .innerJoin(
      schema.scheduleEntries,
      eq(schema.attendanceRecords.scheduleEntryId, schema.scheduleEntries.id),
    )
    .where(eq(schema.attendanceRecords.attendanceDate, today))
    .groupBy(schema.scheduleEntries.classId);

  const todayPeriodMap = new Map(
    todayPeriodCounts.map((row) => [row.classId, Number(row.total)]),
  );

  const classNamesById = new Map(
    classesList.map((cls) => [cls.id, `${cls.grade} — ${cls.section}`]),
  );

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <ClipboardList size={14} strokeWidth={2} />
            وحدة الحضور والغياب
          </p>
          <h2 className="page-title">الحضور والغياب</h2>
          <p className="page-subtitle">
            سجلي الحضور حصة بحصة بالاعتماد على الجدول المعتمد. النظام يحتسب
            الحضور والغياب والتأخر تلقائيًا ويوفر سجلًا لكل طالبة.
          </p>
        </div>
        <div className="top-actions">
          {can(session?.role, "export.run") ? (
            <a
              className="ghost-button"
              href="/api/export/attendance"
              title="تصدير CSV"
            >
              <Download size={16} strokeWidth={2} />
              تصدير CSV
            </a>
          ) : null}
          <span className="pill tone-mint">{formatArabicDate(today)}</span>
        </div>
      </header>

      <section className="grid stats-grid" aria-label="ملخص اليوم">
        <article className="card stat-card tone-mint">
          <div className="stat-header">
            <span>حاضرات اليوم</span>
            <span className="icon-badge tone-mint">
              <CheckCircle2 size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{presentToday}</div>
          <p className="stat-note">{presencePct}% من السجلات اليوم</p>
        </article>

        <article className="card stat-card tone-rose">
          <div className="stat-header">
            <span>غائبات اليوم</span>
            <span className="icon-badge tone-rose">
              <AlertTriangle size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{absentToday}</div>
          <p className="stat-note">يحتاج متابعة وتواصل مع الأهالي</p>
        </article>

        <article className="card stat-card">
          <div className="stat-header">
            <span>متأخرات اليوم</span>
            <span className="icon-badge">
              <TrendingDown size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{lateToday}</div>
          <p className="stat-note">مع {excusedToday} غياب بعذر</p>
        </article>

        <article className="card stat-card">
          <div className="stat-header">
            <span>سجلات اليوم</span>
            <span className="icon-badge">
              <CalendarCheck size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{todayTotal}</div>
          <p className="stat-note">من إجمالي {studentsTotal} طالبة</p>
        </article>
      </section>

      <section className="grid two-col">
        <article className="card">
          <div className="section-heading">
            <h2>تسجيل حضور الفصول</h2>
            <span className="pill">{classesList.length} فصل</span>
          </div>
          {classesList.length === 0 ? (
            <div className="empty-state">
              <h3>{isScoped ? "لا فصول مسندة لكِ" : "لا توجد فصول مسجلة"}</h3>
              <p>
                {isScoped
                  ? "تواصلي مع الإدارة لإسناد جدول وحصص."
                  : "أضيفي فصلًا أولًا حتى يمكن تسجيل الحضور."}
              </p>
              {!isScoped ? (
                <Link className="button" href="/classes/new">
                  إضافة فصل
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="schedule-list">
              {classesList.map((cls) => {
                const todays = todayPeriodMap.get(cls.id) ?? 0;
                return (
                  <li key={cls.id}>
                    <Link href={`/attendance/class/${cls.id}`}>
                      <div>
                        <strong>
                          {cls.grade} — {cls.section}
                        </strong>
                        <span>{cls.academicYear}</span>
                      </div>
                      <span
                        className={`pill ${
                          todays === 0 ? "tone-rose" : "tone-mint"
                        }`}
                      >
                        {todays === 0 ? "لم يبدأ" : `${todays} سجل اليوم`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>أحدث جلسات التسجيل</h2>
            <Link href="/students" className="ghost-link">
              <UserRound size={14} strokeWidth={2} />
              ملفات الطالبات
            </Link>
          </div>

          {recentByClassFiltered.length === 0 ? (
            <div className="empty-state">
              <h3>لم يُسجل حضور بعد</h3>
              <p>اختاري فصلاً وابدئي تسجيل الحضور للحصة الأولى.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الفصل</th>
                  <th>الإجمالي</th>
                  <th>غائبات</th>
                  <th>متأخرات</th>
                </tr>
              </thead>
              <tbody>
                {recentByClassFiltered.map((row) => {
                  const className =
                    classNamesById.get(row.classId) ?? "فصل محذوف";
                  const absent = Number(row.absent ?? 0);
                  const late = Number(row.late ?? 0);
                  return (
                    <tr key={`${row.date}-${row.classId}`}>
                      <td>
                        <Link
                          href={`/attendance/class/${row.classId}?date=${row.date}`}
                        >
                          {formatArabicDate(row.date)}
                        </Link>
                      </td>
                      <td>{className}</td>
                      <td>{Number(row.total)}</td>
                      <td>
                        <span
                          className={`pill ${
                            absent > 0 ? "tone-rose" : "tone-mint"
                          }`}
                        >
                          {absent}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`pill ${
                            late > 0 ? "tone-amber" : "tone-mint"
                          }`}
                        >
                          {late}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {statusBreakdown.length > 0 && (
            <div className="legend-row">
              {statusBreakdown.map((row) => (
                <span
                  key={row.status}
                  className={`pill tone-${statusColor(row.status)}`}
                >
                  {statusLabel(row.status)} · {Number(row.total)}
                </span>
              ))}
            </div>
          )}
        </article>
      </section>
    </>
  );
}
