import { ArrowRight, CalendarDays, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { isUnrestricted, resolveSession } from "@/lib/scope";
import { TimetableGrid, makeTimetableMap } from "../../TimetableGrid";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TeacherSchedulePage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  await requirePermission("schedules.read");
  const { teacherId } = await params;
  if (!UUID_RE.test(teacherId)) notFound();

  const session = await resolveSession();
  if (
    session &&
    !isUnrestricted(session.role) &&
    !(session.role === "teacher" && session.teacherRecordId === teacherId)
  ) {
    redirect("/forbidden");
  }

  const [teacher] = await db
    .select({
      id: schema.teachers.id,
      fullName: schema.teachers.fullName,
      specialty: schema.teachers.specialty,
      weeklyLoad: schema.teachers.weeklyLoad,
    })
    .from(schema.teachers)
    .where(eq(schema.teachers.id, teacherId))
    .limit(1);

  if (!teacher) notFound();

  const entries = await db
    .select({
      id: schema.scheduleEntries.id,
      dayOfWeek: schema.scheduleEntries.dayOfWeek,
      period: schema.scheduleEntries.period,
      notes: schema.scheduleEntries.notes,
      subjectName: schema.subjects.name,
      subjectGrade: schema.subjects.grade,
      classId: schema.classes.id,
      classGrade: schema.classes.grade,
      classSection: schema.classes.section,
    })
    .from(schema.scheduleEntries)
    .innerJoin(
      schema.subjects,
      eq(schema.scheduleEntries.subjectId, schema.subjects.id),
    )
    .innerJoin(
      schema.classes,
      eq(schema.scheduleEntries.classId, schema.classes.id),
    )
    .where(eq(schema.scheduleEntries.teacherId, teacherId))
    .orderBy(
      asc(schema.scheduleEntries.dayOfWeek),
      asc(schema.scheduleEntries.period),
    );

  const cellMap = makeTimetableMap(
    entries.map((entry) => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      period: entry.period,
      subjectName: entry.subjectName,
      subjectGrade: entry.subjectGrade,
      className: `${entry.classGrade} — ${entry.classSection}`,
      classId: entry.classId,
      notes: entry.notes,
    })),
  );

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <CalendarDays size={14} strokeWidth={2} />
            جدول المعلمة
          </p>
          <h2 className="page-title">{teacher.fullName}</h2>
          <p className="page-subtitle">
            تخصص {teacher.specialty} · النصاب الأسبوعي المعتمد{" "}
            <strong>{teacher.weeklyLoad}</strong> · المسجل في الجدول حالياً{" "}
            <strong>{entries.length}</strong> حصة.
          </p>
        </div>

        <div className="top-actions">
          <Link className="ghost-link" href="/schedules">
            <ArrowRight size={16} strokeWidth={2} />
            الرجوع للفهرس
          </Link>
          <Link className="ghost-link" href={`/teachers/${teacher.id}`}>
            <UserRound size={16} strokeWidth={2} />
            ملف المعلمة
          </Link>
        </div>
      </header>

      <section className="card">
        <div className="section-heading">
          <h2>الجدول الأسبوعي</h2>
          {teacher.weeklyLoad > 0 ? (
            <span
              className={`pill ${
                entries.length > teacher.weeklyLoad
                  ? "tone-rose"
                  : entries.length === teacher.weeklyLoad
                  ? "tone-mint"
                  : ""
              }`}
            >
              {entries.length} / {teacher.weeklyLoad}
            </span>
          ) : (
            <span className="pill">{entries.length} حصة</span>
          )}
        </div>

        <TimetableGrid entries={cellMap} mode="teacher" showEditLinks />
      </section>
    </>
  );
}
