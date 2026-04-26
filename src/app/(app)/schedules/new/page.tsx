import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { NewScheduleForm } from "./NewScheduleForm";

export const dynamic = "force-dynamic";

type SearchParams = { classId?: string };

export default async function NewSchedulePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("schedules.write");
  const { classId } = await searchParams;

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
          <p className="eyebrow">إضافة سجل</p>
          <h2 className="page-title">إضافة حصة للجدول</h2>
          <p className="page-subtitle">
            اختاري الفصل، المادة، المعلمة، اليوم، ورقم الحصة. النظام يفحص تلقائيًا
            تعارضات جدول الفصل وجدول المعلمة قبل الحفظ.
          </p>
        </div>

        <Link className="ghost-link" href="/schedules">
          <ArrowRight size={16} strokeWidth={2} />
          الرجوع للفهرس
        </Link>
      </header>

      <section className="card form-card">
        <NewScheduleForm
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          presetClassId={classId}
        />
      </section>
    </>
  );
}
