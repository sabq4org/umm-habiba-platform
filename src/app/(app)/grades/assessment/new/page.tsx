import { ArrowRight, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import NewAssessmentForm from "./NewAssessmentForm";

export const dynamic = "force-dynamic";

export default async function NewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; subjectId?: string }>;
}) {
  await requirePermission("grades.write");
  const sp = await searchParams;

  const [classes, subjects] = await Promise.all([
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
        code: schema.subjects.code,
        grade: schema.subjects.grade,
      })
      .from(schema.subjects)
      .orderBy(asc(schema.subjects.grade), asc(schema.subjects.name)),
  ]);

  const backHref =
    sp?.classId && sp?.subjectId
      ? `/grades/class/${sp.classId}/subject/${sp.subjectId}`
      : sp?.classId
      ? `/grades/class/${sp.classId}`
      : "/grades";

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <ClipboardCheck size={14} strokeWidth={2} />
            تقييم جديد
          </p>
          <h2 className="page-title">إنشاء تقييم</h2>
          <p className="page-subtitle">
            اختاري الفصل والمادة، عرّفي اسم التقييم ودرجته العظمى ووزنه في
            المعدل، ثم انتقلي لرصد درجات الطالبات.
          </p>
        </div>
        <div className="top-actions">
          <Link className="ghost-button" href={backHref}>
            <ArrowRight size={16} strokeWidth={2} />
            رجوع
          </Link>
        </div>
      </header>

      <article className="card">
        <NewAssessmentForm
          classes={classes}
          subjects={subjects}
          initialClassId={sp?.classId}
          initialSubjectId={sp?.subjectId}
        />
      </article>
    </>
  );
}
