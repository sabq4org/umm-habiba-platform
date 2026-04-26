import {
  ArrowRight,
  BookMarked,
  CalendarDays,
  ClipboardCheck,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { isUnrestricted, resolveSession, teacherClassIds } from "@/lib/scope";
import { TERMS, bandFor, kindLabel } from "../../../../constants";

export const dynamic = "force-dynamic";

export default async function SubjectAssessmentsPage({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string }>;
}) {
  await requirePermission("grades.read");
  const { classId, subjectId } = await params;
  const session = await resolveSession();
  if (session && !isUnrestricted(session.role)) {
    if (session.role === "teacher" && session.teacherRecordId) {
      const allowed = await teacherClassIds(session.teacherRecordId);
      if (!allowed.has(classId)) redirect("/forbidden");
    } else {
      redirect("/forbidden");
    }
  }

  const [combo] = await db
    .select({
      classId: schema.classes.id,
      grade: schema.classes.grade,
      section: schema.classes.section,
      academicYear: schema.classes.academicYear,
      subjectId: schema.subjects.id,
      subjectName: schema.subjects.name,
      subjectCode: schema.subjects.code,
      teacherName: schema.teachers.fullName,
    })
    .from(schema.classes)
    .innerJoin(schema.subjects, eq(schema.subjects.id, subjectId))
    .leftJoin(
      schema.teachers,
      eq(schema.subjects.teacherId, schema.teachers.id),
    )
    .where(eq(schema.classes.id, classId))
    .limit(1);

  if (!combo) return notFound();

  const studentsCountRows = await db
    .select({ total: count(schema.students.id) })
    .from(schema.students)
    .where(
      and(
        eq(schema.students.grade, combo.grade),
        eq(schema.students.section, combo.section),
      ),
    );
  const studentsCount = Number(studentsCountRows[0]?.total ?? 0);

  const assessmentsList = await db
    .select({
      id: schema.assessments.id,
      name: schema.assessments.name,
      kind: schema.assessments.kind,
      term: schema.assessments.term,
      maxScore: schema.assessments.maxScore,
      weight: schema.assessments.weight,
      dueDate: schema.assessments.dueDate,
    })
    .from(schema.assessments)
    .where(
      and(
        eq(schema.assessments.classId, classId),
        eq(schema.assessments.subjectId, subjectId),
      ),
    )
    .orderBy(asc(schema.assessments.term), asc(schema.assessments.name));

  const stats = assessmentsList.length
    ? await db
        .select({
          assessmentId: schema.studentGrades.assessmentId,
          graded: count(schema.studentGrades.id),
          avg: sql<number>`AVG(${schema.studentGrades.score}::numeric)`,
        })
        .from(schema.studentGrades)
        .groupBy(schema.studentGrades.assessmentId)
    : [];

  const statsMap = new Map(
    stats.map((row) => [
      row.assessmentId,
      {
        graded: Number(row.graded),
        avgScore:
          row.avg !== null && row.avg !== undefined ? Number(row.avg) : null,
      },
    ]),
  );

  const groupedByTerm = new Map<string, typeof assessmentsList>();
  for (const term of TERMS) groupedByTerm.set(term, []);
  for (const a of assessmentsList) {
    if (!groupedByTerm.has(a.term)) groupedByTerm.set(a.term, []);
    groupedByTerm.get(a.term)!.push(a);
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <ClipboardCheck size={14} strokeWidth={2} />
            تقييمات المادة
          </p>
          <h2 className="page-title">
            {combo.subjectName} — {combo.grade} {combo.section}
          </h2>
          <p className="page-subtitle">
            {combo.academicYear} · المعلمة: {combo.teacherName ?? "—"} ·{" "}
            {studentsCount} طالبة · {assessmentsList.length} تقييم
          </p>
        </div>
        <div className="top-actions">
          <Link
            className="button"
            href={`/grades/assessment/new?classId=${classId}&subjectId=${subjectId}`}
          >
            <Plus size={16} strokeWidth={2} />
            تقييم جديد
          </Link>
          <Link
            className="ghost-button"
            href={`/grades/class/${classId}`}
          >
            <ArrowRight size={16} strokeWidth={2} />
            رجوع للمواد
          </Link>
        </div>
      </header>

      {assessmentsList.length === 0 ? (
        <article className="card">
          <div className="empty-state">
            <h3>لا توجد تقييمات لهذه المادة بعد</h3>
            <p>
              ابدئي بإنشاء تقييم (اختبار، واجب، مشروع…) لرصد درجات الطالبات.
            </p>
            <Link
              className="button"
              href={`/grades/assessment/new?classId=${classId}&subjectId=${subjectId}`}
            >
              <Plus size={16} strokeWidth={2} />
              إنشاء تقييم
            </Link>
          </div>
        </article>
      ) : (
        Array.from(groupedByTerm.entries()).map(([term, items]) => {
          if (items.length === 0) return null;
          const totalWeight = items.reduce((s, it) => s + it.weight, 0);
          return (
            <article className="card" key={term}>
              <div className="section-heading">
                <h2>{term}</h2>
                <span
                  className={`pill ${
                    totalWeight === 100
                      ? "tone-mint"
                      : totalWeight > 100
                      ? "tone-rose"
                      : "tone-amber"
                  }`}
                >
                  مجموع الأوزان: {totalWeight}%
                </span>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>التقييم</th>
                    <th>النوع</th>
                    <th>الدرجة العظمى</th>
                    <th>الوزن</th>
                    <th>تاريخ التسليم</th>
                    <th>الدرجات</th>
                    <th>المتوسط</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => {
                    const s = statsMap.get(a.id);
                    const avgPct = s?.avgScore
                      ? Math.round((s.avgScore / a.maxScore) * 1000) / 10
                      : null;
                    const band = bandFor(avgPct);
                    const gradedPct =
                      studentsCount > 0
                        ? Math.round(((s?.graded ?? 0) / studentsCount) * 100)
                        : 0;
                    return (
                      <tr key={a.id}>
                        <td>
                          <Link
                            className="row-link"
                            href={`/grades/assessment/${a.id}`}
                          >
                            <BookMarked size={14} strokeWidth={2} />
                            <strong>{a.name}</strong>
                          </Link>
                        </td>
                        <td>
                          <span className="pill">{kindLabel(a.kind)}</span>
                        </td>
                        <td>{a.maxScore}</td>
                        <td>{a.weight}%</td>
                        <td>
                          {a.dueDate ? (
                            <span className="muted-text">
                              <CalendarDays
                                size={12}
                                strokeWidth={2}
                                style={{ marginInlineEnd: 4 }}
                              />
                              {a.dueDate}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span
                            className={`pill ${
                              gradedPct === 100
                                ? "tone-mint"
                                : gradedPct === 0
                                ? "tone-rose"
                                : "tone-amber"
                            }`}
                          >
                            {s?.graded ?? 0}/{studentsCount}
                          </span>
                        </td>
                        <td>
                          {avgPct !== null ? (
                            <span className={`pill tone-${band.tone}`}>
                              {avgPct}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </article>
          );
        })
      )}
    </>
  );
}
