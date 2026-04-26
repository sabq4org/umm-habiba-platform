import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { canTeacherAccessAssessment, resolveSession } from "@/lib/scope";
import { kindLabel } from "../../constants";
import RecordGradesForm from "./RecordGradesForm";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ saved?: string }>;

export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requirePermission("grades.read");
  const { id } = await params;
  const session = await resolveSession();
  if (session && !(await canTeacherAccessAssessment(session, id))) {
    redirect("/forbidden");
  }
  const sp = await searchParams;

  const [assessment] = await db
    .select({
      id: schema.assessments.id,
      classId: schema.assessments.classId,
      subjectId: schema.assessments.subjectId,
      name: schema.assessments.name,
      kind: schema.assessments.kind,
      term: schema.assessments.term,
      maxScore: schema.assessments.maxScore,
      weight: schema.assessments.weight,
      dueDate: schema.assessments.dueDate,
      notes: schema.assessments.notes,
      grade: schema.classes.grade,
      section: schema.classes.section,
      academicYear: schema.classes.academicYear,
      subjectName: schema.subjects.name,
      teacherName: schema.teachers.fullName,
    })
    .from(schema.assessments)
    .innerJoin(
      schema.classes,
      eq(schema.assessments.classId, schema.classes.id),
    )
    .innerJoin(
      schema.subjects,
      eq(schema.assessments.subjectId, schema.subjects.id),
    )
    .leftJoin(
      schema.teachers,
      eq(schema.subjects.teacherId, schema.teachers.id),
    )
    .where(eq(schema.assessments.id, id))
    .limit(1);

  if (!assessment) return notFound();

  const studentsList = await db
    .select({
      id: schema.students.id,
      fullName: schema.students.fullName,
      nationalId: schema.students.nationalId,
    })
    .from(schema.students)
    .where(
      and(
        eq(schema.students.grade, assessment.grade),
        eq(schema.students.section, assessment.section),
      ),
    )
    .orderBy(asc(schema.students.fullName));

  const existing = await db
    .select({
      studentId: schema.studentGrades.studentId,
      score: schema.studentGrades.score,
      notes: schema.studentGrades.notes,
    })
    .from(schema.studentGrades)
    .where(eq(schema.studentGrades.assessmentId, assessment.id));

  const existingMap = new Map(
    existing.map((row) => [
      row.studentId,
      { score: row.score, notes: row.notes ?? "" },
    ]),
  );

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <ClipboardCheck size={14} strokeWidth={2} />
            تقييم — {kindLabel(assessment.kind)}
          </p>
          <h2 className="page-title">{assessment.name}</h2>
          <p className="page-subtitle">
            {assessment.subjectName} · {assessment.grade} —{" "}
            {assessment.section} · {assessment.term} · الدرجة العظمى{" "}
            {assessment.maxScore} · الوزن {assessment.weight}%
          </p>
        </div>
        <div className="top-actions">
          <Link
            className="ghost-button"
            href={`/grades/assessment/${assessment.id}/edit`}
          >
            <Pencil size={16} strokeWidth={2} />
            تعديل التقييم
          </Link>
          <Link
            className="ghost-button"
            href={`/grades/class/${assessment.classId}/subject/${assessment.subjectId}`}
          >
            <ArrowRight size={16} strokeWidth={2} />
            رجوع للمادة
          </Link>
        </div>
      </header>

      {sp?.saved === "1" && (
        <div className="notice tone-mint">
          <CheckCircle2 size={18} strokeWidth={2} />
          تم حفظ الدرجات بنجاح.
        </div>
      )}

      <article className="card">
        <div className="legend-row">
          <span className="pill">{kindLabel(assessment.kind)}</span>
          <span className="pill">{assessment.term}</span>
          <span className="pill">{assessment.academicYear}</span>
          {assessment.dueDate && (
            <span className="pill">
              <CalendarDays
                size={12}
                strokeWidth={2}
                style={{ marginInlineEnd: 4 }}
              />
              تسليم: {assessment.dueDate}
            </span>
          )}
          <span className="pill">المعلمة: {assessment.teacherName ?? "—"}</span>
        </div>
        {assessment.notes && (
          <p className="notes-text" style={{ marginTop: 12 }}>
            {assessment.notes}
          </p>
        )}
      </article>

      {studentsList.length === 0 ? (
        <article className="card">
          <div className="empty-state">
            <h3>لا توجد طالبات في هذا الفصل</h3>
            <p>
              أضيفي طالبات لـ {assessment.grade} — {assessment.section} لتفعيل
              رصد الدرجات.
            </p>
            <Link className="button" href="/students/new">
              إضافة طالبة
            </Link>
          </div>
        </article>
      ) : (
        <RecordGradesForm
          assessmentId={assessment.id}
          maxScore={assessment.maxScore}
          students={studentsList}
          existing={Object.fromEntries(existingMap)}
        />
      )}
    </>
  );
}
