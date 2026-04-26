import {
  Award,
  ArrowRight,
  ClipboardCheck,
  GraduationCap,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { guardianCanAccessStudent, resolveSession } from "@/lib/scope";
import {
  TERMS,
  bandFor,
  kindLabel,
  pctFromScore,
} from "../../constants";

export const dynamic = "force-dynamic";

type AssessmentRow = {
  assessmentId: string;
  assessmentName: string;
  kind: string;
  term: string;
  maxScore: number;
  weight: number;
  subjectId: string;
  subjectName: string;
  score: number | null;
};

export default async function StudentGradesPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requirePermission("grades.read");
  const { studentId } = await params;
  const session = await resolveSession();
  if (session && !guardianCanAccessStudent(session, studentId)) {
    redirect("/forbidden");
  }

  const [student] = await db
    .select({
      id: schema.students.id,
      fullName: schema.students.fullName,
      nationalId: schema.students.nationalId,
      grade: schema.students.grade,
      section: schema.students.section,
    })
    .from(schema.students)
    .where(eq(schema.students.id, studentId))
    .limit(1);

  if (!student) return notFound();

  const [classRow] = await db
    .select({
      id: schema.classes.id,
      academicYear: schema.classes.academicYear,
    })
    .from(schema.classes)
    .where(
      and(
        eq(schema.classes.grade, student.grade),
        eq(schema.classes.section, student.section),
      ),
    )
    .limit(1);

  const rows: AssessmentRow[] = classRow
    ? await db
        .select({
          assessmentId: schema.assessments.id,
          assessmentName: schema.assessments.name,
          kind: schema.assessments.kind,
          term: schema.assessments.term,
          maxScore: schema.assessments.maxScore,
          weight: schema.assessments.weight,
          subjectId: schema.assessments.subjectId,
          subjectName: schema.subjects.name,
          score: schema.studentGrades.score,
        })
        .from(schema.assessments)
        .innerJoin(
          schema.subjects,
          eq(schema.assessments.subjectId, schema.subjects.id),
        )
        .leftJoin(
          schema.studentGrades,
          and(
            eq(schema.studentGrades.assessmentId, schema.assessments.id),
            eq(schema.studentGrades.studentId, student.id),
          ),
        )
        .where(eq(schema.assessments.classId, classRow.id))
        .orderBy(
          asc(schema.assessments.term),
          asc(schema.subjects.name),
          asc(schema.assessments.name),
        )
    : [];

  type SubjectAggregate = {
    subjectId: string;
    subjectName: string;
    perTerm: Record<string, AssessmentRow[]>;
    weightedSum: number;
    coveredWeight: number;
  };

  const subjectMap = new Map<string, SubjectAggregate>();
  for (const row of rows) {
    if (!subjectMap.has(row.subjectId)) {
      subjectMap.set(row.subjectId, {
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        perTerm: { "الفصل الأول": [], "الفصل الثاني": [], "الفصل الثالث": [] },
        weightedSum: 0,
        coveredWeight: 0,
      });
    }
    const agg = subjectMap.get(row.subjectId)!;
    if (!agg.perTerm[row.term]) agg.perTerm[row.term] = [];
    agg.perTerm[row.term].push(row);

    if (row.score !== null && row.weight > 0 && row.maxScore > 0) {
      agg.weightedSum += (row.score / row.maxScore) * row.weight;
      agg.coveredWeight += row.weight;
    }
  }

  const subjectAggs = Array.from(subjectMap.values()).map((agg) => {
    const finalPct = agg.coveredWeight > 0
      ? Math.round((agg.weightedSum / agg.coveredWeight) * 100 * 10) / 10
      : null;
    return { ...agg, finalPct };
  });

  const overallPctValues = subjectAggs
    .map((a) => a.finalPct)
    .filter((v): v is number => v !== null);
  const overall = overallPctValues.length
    ? Math.round(
        (overallPctValues.reduce((a, b) => a + b, 0) /
          overallPctValues.length) *
          10,
      ) / 10
    : null;
  const overallBand = bandFor(overall);

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <ClipboardCheck size={14} strokeWidth={2} />
            سجل درجات الطالبة
          </p>
          <h2 className="page-title">{student.fullName}</h2>
          <p className="page-subtitle">
            {student.grade} — {student.section}
            {classRow ? ` · ${classRow.academicYear}` : ""} · رقم الهوية{" "}
            {student.nationalId}
          </p>
        </div>
        <div className="top-actions">
          <Link
            className="button"
            href={`/grades/student/${student.id}/certificate`}
          >
            <Award size={16} strokeWidth={2} />
            عرض الشهادة
          </Link>
          <Link className="ghost-button" href={`/students/${student.id}`}>
            <GraduationCap size={16} strokeWidth={2} />
            ملف الطالبة
          </Link>
          <Link className="ghost-button" href="/grades">
            <ArrowRight size={16} strokeWidth={2} />
            رجوع
          </Link>
        </div>
      </header>

      <section className="grid stats-grid">
        <article className={`card stat-card tone-${overallBand.tone === "ok" ? "mint" : overallBand.tone === "danger" ? "rose" : "default"}`}>
          <div className="stat-header">
            <span>المعدل العام</span>
            <span
              className={`icon-badge ${
                overallBand.tone === "ok" ? "tone-mint" : ""
              }`}
            >
              <Award size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">
            {overall !== null ? `${overall}%` : "—"}
          </div>
          <p className="stat-note">{overallBand.label}</p>
        </article>

        <article className="card stat-card">
          <div className="stat-header">
            <span>المواد المُقيَّمة</span>
            <span className="icon-badge">
              <ClipboardCheck size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{subjectAggs.length}</div>
          <p className="stat-note">من إجمالي مواد الصف</p>
        </article>

        <article className="card stat-card">
          <div className="stat-header">
            <span>تقييمات مرصودة</span>
            <span className="icon-badge">
              <Printer size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">
            {rows.filter((r) => r.score !== null).length}
          </div>
          <p className="stat-note">من أصل {rows.length} تقييم</p>
        </article>
      </section>

      {subjectAggs.length === 0 ? (
        <article className="card">
          <div className="empty-state">
            <h3>لا توجد تقييمات لهذا الفصل</h3>
            <p>سيظهر سجل الدرجات فور إنشاء التقييمات ورصد الدرجات.</p>
          </div>
        </article>
      ) : (
        subjectAggs.map((agg) => {
          const band = bandFor(agg.finalPct);
          return (
            <article className="card" key={agg.subjectId}>
              <div className="section-heading">
                <h2>{agg.subjectName}</h2>
                <span className={`pill tone-${band.tone}`}>
                  {agg.finalPct !== null
                    ? `${agg.finalPct}% · ${band.label}`
                    : "لا يوجد تقدير"}
                </span>
              </div>

              {TERMS.map((term) => {
                const items = agg.perTerm[term] ?? [];
                if (items.length === 0) return null;
                return (
                  <div key={term} className="term-block">
                    <h3 className="term-heading">{term}</h3>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>التقييم</th>
                          <th>النوع</th>
                          <th>الدرجة</th>
                          <th>النسبة</th>
                          <th>الوزن</th>
                          <th>التقدير</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => {
                          const pct = pctFromScore(it.score, it.maxScore);
                          const itemBand = bandFor(pct);
                          return (
                            <tr key={it.assessmentId}>
                              <td>{it.assessmentName}</td>
                              <td>
                                <span className="pill">
                                  {kindLabel(it.kind)}
                                </span>
                              </td>
                              <td>
                                {it.score !== null
                                  ? `${it.score} / ${it.maxScore}`
                                  : "—"}
                              </td>
                              <td>{pct !== null ? `${pct}%` : "—"}</td>
                              <td>{it.weight}%</td>
                              <td>
                                <span className={`pill tone-${itemBand.tone}`}>
                                  {itemBand.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </article>
          );
        })
      )}
    </>
  );
}
