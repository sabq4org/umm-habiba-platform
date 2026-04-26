import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { EditScheduleForm } from "./EditScheduleForm";
import { DeleteScheduleButton } from "./DeleteScheduleButton";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("schedules.write");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [entry] = await db
    .select()
    .from(schema.scheduleEntries)
    .where(eq(schema.scheduleEntries.id, id))
    .limit(1);

  if (!entry) notFound();

  const [classes, subjects, teachers] = await Promise.all([
    db
      .select({
        id: schema.classes.id,
        grade: schema.classes.grade,
        section: schema.classes.section,
        academicYear: schema.classes.academicYear,
      })
      .from(schema.classes)
      .orderBy(asc(schema.classes.grade), asc(schema.classes.section)),
    db
      .select({
        id: schema.subjects.id,
        name: schema.subjects.name,
        grade: schema.subjects.grade,
        teacherId: schema.subjects.teacherId,
      })
      .from(schema.subjects)
      .orderBy(asc(schema.subjects.grade), asc(schema.subjects.name)),
    db
      .select({
        id: schema.teachers.id,
        fullName: schema.teachers.fullName,
        specialty: schema.teachers.specialty,
      })
      .from(schema.teachers)
      .orderBy(asc(schema.teachers.fullName)),
  ]);

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">تعديل سجل</p>
          <h2 className="page-title">تعديل حصة</h2>
          <p className="page-subtitle">
            عدّلي بيانات الحصة. النظام سيفحص تعارضات الفصل والمعلمة قبل الحفظ.
          </p>
        </div>

        <Link
          className="ghost-link"
          href={`/schedules/class/${entry.classId}`}
        >
          <ArrowRight size={16} strokeWidth={2} />
          الرجوع لجدول الفصل
        </Link>
      </header>

      <section className="card form-card">
        <EditScheduleForm
          id={entry.id}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          values={{
            classId: entry.classId,
            subjectId: entry.subjectId,
            teacherId: entry.teacherId ?? "",
            dayOfWeek: entry.dayOfWeek,
            period: String(entry.period),
            notes: entry.notes ?? "",
          }}
        />
      </section>

      <section className="card danger-zone">
        <div className="section-heading">
          <h2>منطقة الإجراءات الحساسة</h2>
        </div>
        <div className="danger-row">
          <div>
            <h3>حذف الحصة من الجدول</h3>
            <p>
              سيتم حذف هذه الحصة من جدول الفصل والمعلمة. هذا الإجراء لا يمكن
              التراجع عنه.
            </p>
          </div>
          <DeleteScheduleButton
            id={entry.id}
            classId={entry.classId}
            teacherId={entry.teacherId ?? undefined}
          />
        </div>
      </section>
    </>
  );
}
