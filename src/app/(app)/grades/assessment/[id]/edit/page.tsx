import { ArrowRight, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import EditAssessmentForm from "./EditAssessmentForm";
import DeleteAssessmentButton from "./DeleteAssessmentButton";

export const dynamic = "force-dynamic";

export default async function EditAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("grades.write");
  const { id } = await params;

  const [assessment] = await db
    .select()
    .from(schema.assessments)
    .where(eq(schema.assessments.id, id))
    .limit(1);

  if (!assessment) return notFound();

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

  const initialValues = {
    classId: assessment.classId,
    subjectId: assessment.subjectId,
    name: assessment.name,
    kind: assessment.kind,
    term: assessment.term,
    maxScore: String(assessment.maxScore),
    weight: String(assessment.weight),
    dueDate: assessment.dueDate ?? "",
    notes: assessment.notes ?? "",
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <ClipboardCheck size={14} strokeWidth={2} />
            تعديل تقييم
          </p>
          <h2 className="page-title">{assessment.name}</h2>
          <p className="page-subtitle">
            عدّلي تفاصيل التقييم. الدرجات الموجودة لن تتغير، لكن انتبهي عند تعديل
            الدرجة العظمى — قد يجعل بعض الدرجات خارج الحدود.
          </p>
        </div>
        <div className="top-actions">
          <Link className="ghost-button" href={`/grades/assessment/${id}`}>
            <ArrowRight size={16} strokeWidth={2} />
            رجوع للتقييم
          </Link>
        </div>
      </header>

      <article className="card">
        <EditAssessmentForm
          id={id}
          classes={classes}
          subjects={subjects}
          initialValues={initialValues}
        />
      </article>

      <article className="card danger-zone">
        <div className="section-heading">
          <h2>منطقة الخطر</h2>
          <span className="pill tone-rose">تأثير دائم</span>
        </div>
        <p className="muted-text">
          حذف التقييم يؤدي لحذف جميع درجات الطالبات المرصودة فيه (لن يؤثر على
          باقي التقييمات).
        </p>
        <DeleteAssessmentButton
          id={id}
          classId={assessment.classId}
          subjectId={assessment.subjectId}
        />
      </article>
    </>
  );
}
