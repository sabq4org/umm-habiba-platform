import { ArrowRight, BookOpen, CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { can, requirePermission } from "@/lib/permissions";
import { isUnrestricted, resolveSession, teacherClassIds } from "@/lib/scope";
import { TimetableGrid, makeTimetableMap } from "../../TimetableGrid";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClassSchedulePage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  await requirePermission("schedules.read");
  const { classId } = await params;
  if (!UUID_RE.test(classId)) notFound();

  const session = await resolveSession();
  if (session && !isUnrestricted(session.role)) {
    if (session.role === "teacher" && session.teacherRecordId) {
      const allowed = await teacherClassIds(session.teacherRecordId);
      if (!allowed.has(classId)) redirect("/forbidden");
    } else {
      redirect("/forbidden");
    }
  }
  const canEditSchedule = can(session?.role, "schedules.write");

  const [classRow] = await db
    .select({
      id: schema.classes.id,
      grade: schema.classes.grade,
      section: schema.classes.section,
      academicYear: schema.classes.academicYear,
      room: schema.classes.room,
    })
    .from(schema.classes)
    .where(eq(schema.classes.id, classId))
    .limit(1);

  if (!classRow) notFound();

  const entries = await db
    .select({
      id: schema.scheduleEntries.id,
      dayOfWeek: schema.scheduleEntries.dayOfWeek,
      period: schema.scheduleEntries.period,
      notes: schema.scheduleEntries.notes,
      subjectName: schema.subjects.name,
      subjectGrade: schema.subjects.grade,
      teacherId: schema.scheduleEntries.teacherId,
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
    .where(eq(schema.scheduleEntries.classId, classId))
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
      teacherName: entry.teacherName,
      teacherId: entry.teacherId,
      notes: entry.notes,
    })),
  );

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <CalendarDays size={14} strokeWidth={2} />
            جدول الفصل
          </p>
          <h2 className="page-title">
            {classRow.grade} — {classRow.section}
          </h2>
          <p className="page-subtitle">
            العام الدراسي {classRow.academicYear} · الغرفة{" "}
            <span className="mono">{classRow.room ?? "—"}</span> · {entries.length}{" "}
            حصة مسجلة. اضغطي على أي حصة لتعديلها أو على زر «إضافة حصة» لإضافة
            حصة جديدة.
          </p>
        </div>

        <div className="top-actions">
          <Link className="ghost-link" href="/schedules">
            <ArrowRight size={16} strokeWidth={2} />
            الرجوع للفهرس
          </Link>
          <Link className="ghost-link" href={`/classes/${classRow.id}`}>
            <BookOpen size={16} strokeWidth={2} />
            ملف الفصل
          </Link>
          {canEditSchedule ? (
            <Link
              className="button"
              href={`/schedules/new?classId=${classRow.id}`}
            >
              <Plus size={18} strokeWidth={2} />
              إضافة حصة
            </Link>
          ) : null}
        </div>
      </header>

      <section className="card">
        <div className="section-heading">
          <h2>الجدول الأسبوعي</h2>
          {canEditSchedule ? (
            <span className="pill tone-mint">قابل للتعديل</span>
          ) : (
            <span className="pill tone-stone">عرض فقط</span>
          )}
        </div>

        <TimetableGrid
          entries={cellMap}
          mode="class"
          showEditLinks={canEditSchedule}
        />
      </section>
    </>
  );
}
