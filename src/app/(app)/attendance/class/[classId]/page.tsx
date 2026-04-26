import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Clock,
  PenLine,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { isUnrestricted, resolveSession, teacherClassIds } from "@/lib/scope";
import {
  arabicDayFromDate,
  formatArabicDate,
  isoToDate,
  isValidIsoDate,
  statusColor,
  statusLabel,
  todayIso,
} from "../../constants";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  date?: string;
  saved?: string;
  cleared?: string;
}>;

export default async function AttendanceClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: SearchParams;
}) {
  await requirePermission("attendance.read");
  const { classId } = await params;
  const session = await resolveSession();
  if (session && !isUnrestricted(session.role)) {
    if (session.role === "teacher" && session.teacherRecordId) {
      const allowed = await teacherClassIds(session.teacherRecordId);
      if (!allowed.has(classId)) redirect("/forbidden");
    } else {
      redirect("/forbidden");
    }
  }
  const sp = await searchParams;
  const dateParam = sp?.date && isValidIsoDate(sp.date) ? sp.date : todayIso();

  const [cls] = await db
    .select({
      id: schema.classes.id,
      grade: schema.classes.grade,
      section: schema.classes.section,
      academicYear: schema.classes.academicYear,
      capacity: schema.classes.capacity,
      room: schema.classes.room,
      homeroomTeacherName: schema.teachers.fullName,
    })
    .from(schema.classes)
    .leftJoin(
      schema.teachers,
      eq(schema.classes.homeroomTeacherId, schema.teachers.id),
    )
    .where(eq(schema.classes.id, classId))
    .limit(1);

  if (!cls) return notFound();

  const dayName = arabicDayFromDate(isoToDate(dateParam));

  const enrolledStudents = await db
    .select({ id: schema.students.id })
    .from(schema.students)
    .where(
      and(
        eq(schema.students.grade, cls.grade),
        eq(schema.students.section, cls.section),
      ),
    );
  const studentsCount = enrolledStudents.length;

  const dayEntries = dayName
    ? await db
        .select({
          id: schema.scheduleEntries.id,
          period: schema.scheduleEntries.period,
          dayOfWeek: schema.scheduleEntries.dayOfWeek,
          subjectName: schema.subjects.name,
          teacherName: schema.teachers.fullName,
        })
        .from(schema.scheduleEntries)
        .innerJoin(
          schema.subjects,
          eq(schema.scheduleEntries.subjectId, schema.subjects.id),
        )
        .leftJoin(
          schema.teachers,
          eq(schema.scheduleEntries.teacherId, schema.teachers.id),
        )
        .where(
          and(
            eq(schema.scheduleEntries.classId, classId),
            eq(schema.scheduleEntries.dayOfWeek, dayName),
          ),
        )
        .orderBy(asc(schema.scheduleEntries.period))
    : [];

  const breakdownByEntry = dayEntries.length
    ? await db
        .select({
          scheduleEntryId: schema.attendanceRecords.scheduleEntryId,
          status: schema.attendanceRecords.status,
          total: sql<number>`COUNT(*)`,
        })
        .from(schema.attendanceRecords)
        .where(eq(schema.attendanceRecords.attendanceDate, dateParam))
        .groupBy(
          schema.attendanceRecords.scheduleEntryId,
          schema.attendanceRecords.status,
        )
    : [];

  const breakdownMap = new Map<string, Map<string, number>>();
  for (const row of breakdownByEntry) {
    if (!breakdownMap.has(row.scheduleEntryId)) {
      breakdownMap.set(row.scheduleEntryId, new Map());
    }
    breakdownMap
      .get(row.scheduleEntryId)!
      .set(row.status, Number(row.total));
  }

  const dayPresent = dayEntries.reduce(
    (sum, entry) =>
      sum + (breakdownMap.get(entry.id)?.get("present") ?? 0),
    0,
  );
  const dayAbsent = dayEntries.reduce(
    (sum, entry) =>
      sum + (breakdownMap.get(entry.id)?.get("absent") ?? 0),
    0,
  );
  const dayLate = dayEntries.reduce(
    (sum, entry) =>
      sum + (breakdownMap.get(entry.id)?.get("late") ?? 0),
    0,
  );
  const dayRecorded = dayEntries.reduce(
    (sum, entry) =>
      sum +
      Array.from(breakdownMap.get(entry.id)?.values() ?? []).reduce(
        (s, v) => s + v,
        0,
      ),
    0,
  );

  const expectedTotal = studentsCount * dayEntries.length;
  const completionPct = expectedTotal > 0
    ? Math.round((dayRecorded / expectedTotal) * 100)
    : 0;

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <ClipboardList size={14} strokeWidth={2} />
            تسجيل الحضور — {cls.grade} {cls.section}
          </p>
          <h2 className="page-title">{formatArabicDate(dateParam)}</h2>
          <p className="page-subtitle">
            {dayName
              ? `${dayEntries.length} حصة في هذا اليوم · ${studentsCount} طالبة في الفصل`
              : "هذا اليوم خارج أيام الدراسة الرسمية (السبت أو الجمعة)"}
          </p>
        </div>
        <div className="top-actions">
          <Link
            className="ghost-button"
            href={`/schedules/class/${cls.id}`}
          >
            <CalendarRange size={16} strokeWidth={2} />
            جدول الفصل
          </Link>
          <Link className="ghost-button" href="/attendance">
            رجوع للفهرس
          </Link>
        </div>
      </header>

      {sp?.saved === "1" && (
        <div className="notice tone-mint">
          <CheckCircle2 size={18} strokeWidth={2} />
          تم حفظ الحضور بنجاح.
        </div>
      )}
      {sp?.cleared === "1" && (
        <div className="notice tone-rose">
          <AlertTriangle size={18} strokeWidth={2} />
          تم حذف سجل هذه الحصة.
        </div>
      )}

      <article className="card">
        <form
          method="GET"
          action={`/attendance/class/${cls.id}`}
          className="form-row"
        >
          <label>
            <span>اختاري التاريخ</span>
            <input type="date" name="date" defaultValue={dateParam} />
          </label>
          <button type="submit" className="ghost-button">
            عرض
          </button>
        </form>

        <div className="legend-row">
          <span className="pill tone-mint">حاضرات: {dayPresent}</span>
          <span className="pill tone-rose">غائبات: {dayAbsent}</span>
          <span className="pill tone-amber">متأخرات: {dayLate}</span>
          <span className="pill">
            اكتمال التسجيل: {completionPct}% ({dayRecorded}/{expectedTotal})
          </span>
        </div>
      </article>

      <article className="card">
        <div className="section-heading">
          <h2>حصص اليوم</h2>
          <span className="pill">
            {dayEntries.length} حصة · {dayName ?? "—"}
          </span>
        </div>

        {!dayName ? (
          <div className="empty-state">
            <h3>يوم غير دراسي</h3>
            <p>اختاري تاريخًا ضمن أيام الدراسة (الأحد - الخميس).</p>
          </div>
        ) : dayEntries.length === 0 ? (
          <div className="empty-state">
            <h3>لا توجد حصص</h3>
            <p>لم يُسجل أي حصة لهذا الفصل في يوم {dayName}.</p>
            <Link className="button" href={`/schedules/class/${cls.id}`}>
              إعداد جدول الفصل
            </Link>
          </div>
        ) : studentsCount === 0 ? (
          <div className="empty-state">
            <h3>لا توجد طالبات في الفصل</h3>
            <p>
              سجلي طالبات في {cls.grade} — {cls.section} لتفعيل تسجيل الحضور.
            </p>
            <Link className="button" href="/students/new">
              إضافة طالبة
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>الحصة</th>
                <th>المادة</th>
                <th>المعلمة</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {dayEntries.map((entry) => {
                const stats = breakdownMap.get(entry.id);
                const recorded = Array.from(stats?.values() ?? []).reduce(
                  (s, v) => s + v,
                  0,
                );
                const isRecorded = recorded > 0;
                return (
                  <tr key={entry.id}>
                    <td>
                      <span className="pill">حصة {entry.period}</span>
                    </td>
                    <td>
                      <strong>{entry.subjectName}</strong>
                    </td>
                    <td>{entry.teacherName ?? "—"}</td>
                    <td>
                      {!isRecorded ? (
                        <span className="pill tone-amber">
                          <Clock size={12} strokeWidth={2} />
                          لم يُسجل
                        </span>
                      ) : (
                        <div className="legend-row">
                          {Array.from(stats?.entries() ?? []).map(
                            ([status, total]) => (
                              <span
                                key={status}
                                className={`pill tone-${statusColor(status)}`}
                              >
                                {statusLabel(status)}: {total}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <Link
                        className="button"
                        href={`/attendance/record/${entry.id}?date=${dateParam}`}
                      >
                        <PenLine size={14} strokeWidth={2} />
                        {isRecorded ? "تعديل" : "تسجيل"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>
    </>
  );
}
