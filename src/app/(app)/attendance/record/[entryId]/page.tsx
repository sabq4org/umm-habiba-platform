import { ArrowRight, CalendarRange, ClipboardList } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { canTeacherAccessScheduleEntry, resolveSession } from "@/lib/scope";
import {
  formatArabicDate,
  isValidIsoDate,
  todayIso,
} from "../../constants";
import RecordAttendanceForm from "./RecordAttendanceForm";
import ClearAttendanceButton from "./ClearAttendanceButton";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ date?: string }>;

export default async function RecordAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ entryId: string }>;
  searchParams: SearchParams;
}) {
  await requirePermission("attendance.write");
  const { entryId } = await params;
  const session = await resolveSession();
  if (session && !(await canTeacherAccessScheduleEntry(session, entryId))) {
    redirect("/forbidden");
  }
  const sp = await searchParams;
  const dateParam = sp?.date && isValidIsoDate(sp.date) ? sp.date : todayIso();

  const [entry] = await db
    .select({
      id: schema.scheduleEntries.id,
      period: schema.scheduleEntries.period,
      dayOfWeek: schema.scheduleEntries.dayOfWeek,
      classId: schema.scheduleEntries.classId,
      grade: schema.classes.grade,
      section: schema.classes.section,
      academicYear: schema.classes.academicYear,
      subjectName: schema.subjects.name,
      teacherName: schema.teachers.fullName,
    })
    .from(schema.scheduleEntries)
    .innerJoin(
      schema.classes,
      eq(schema.scheduleEntries.classId, schema.classes.id),
    )
    .innerJoin(
      schema.subjects,
      eq(schema.scheduleEntries.subjectId, schema.subjects.id),
    )
    .leftJoin(
      schema.teachers,
      eq(schema.scheduleEntries.teacherId, schema.teachers.id),
    )
    .where(eq(schema.scheduleEntries.id, entryId))
    .limit(1);

  if (!entry) return notFound();

  const studentsList = await db
    .select({
      id: schema.students.id,
      fullName: schema.students.fullName,
      nationalId: schema.students.nationalId,
    })
    .from(schema.students)
    .where(
      and(
        eq(schema.students.grade, entry.grade),
        eq(schema.students.section, entry.section),
      ),
    )
    .orderBy(asc(schema.students.fullName));

  const existing = await db
    .select({
      studentId: schema.attendanceRecords.studentId,
      status: schema.attendanceRecords.status,
      notes: schema.attendanceRecords.notes,
    })
    .from(schema.attendanceRecords)
    .where(
      and(
        eq(schema.attendanceRecords.scheduleEntryId, entry.id),
        eq(schema.attendanceRecords.attendanceDate, dateParam),
      ),
    );

  const existingMap = new Map(
    existing.map((row) => [
      row.studentId,
      { status: row.status, notes: row.notes ?? "" },
    ]),
  );
  const hasExisting = existing.length > 0;

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <ClipboardList size={14} strokeWidth={2} />
            تسجيل حصة — {entry.subjectName}
          </p>
          <h2 className="page-title">
            {entry.grade} — {entry.section} · حصة {entry.period}
          </h2>
          <p className="page-subtitle">
            {formatArabicDate(dateParam)} · المعلمة: {entry.teacherName ?? "—"}
          </p>
        </div>
        <div className="top-actions">
          <Link
            className="ghost-button"
            href={`/attendance/class/${entry.classId}?date=${dateParam}`}
          >
            <ArrowRight size={16} strokeWidth={2} />
            رجوع لجدول اليوم
          </Link>
          <Link
            className="ghost-button"
            href={`/schedules/class/${entry.classId}`}
          >
            <CalendarRange size={16} strokeWidth={2} />
            جدول الفصل
          </Link>
        </div>
      </header>

      {studentsList.length === 0 ? (
        <article className="card">
          <div className="empty-state">
            <h3>لا توجد طالبات في هذا الفصل</h3>
            <p>
              أضيفي طالبات إلى {entry.grade} — {entry.section} لتفعيل التسجيل.
            </p>
            <Link className="button" href="/students/new">
              إضافة طالبة
            </Link>
          </div>
        </article>
      ) : (
        <RecordAttendanceForm
          scheduleEntryId={entry.id}
          attendanceDate={dateParam}
          students={studentsList}
          existing={Object.fromEntries(existingMap)}
        />
      )}

      {hasExisting && (
        <article className="card">
          <div className="section-heading">
            <h2>إجراءات إضافية</h2>
          </div>
          <p className="muted-text">
            يمكنك حذف سجل هذه الحصة لهذا التاريخ بالكامل (لن يتأثر باقي الأيام).
          </p>
          <ClearAttendanceButton
            scheduleEntryId={entry.id}
            attendanceDate={dateParam}
            classId={entry.classId}
          />
        </article>
      )}
    </>
  );
}

export const metadata = {
  title: "تسجيل الحضور",
};
