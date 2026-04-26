import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { guardianCanAccessStudent, resolveSession } from "@/lib/scope";
import { TERMS, bandFor } from "../../../constants";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function StudentCertificatePage({
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
    .select()
    .from(schema.students)
    .where(eq(schema.students.id, studentId))
    .limit(1);

  if (!student) return notFound();

  const [classRow] = await db
    .select({
      id: schema.classes.id,
      academicYear: schema.classes.academicYear,
      homeroomTeacherId: schema.classes.homeroomTeacherId,
      homeroomTeacherName: schema.teachers.fullName,
    })
    .from(schema.classes)
    .leftJoin(
      schema.teachers,
      eq(schema.classes.homeroomTeacherId, schema.teachers.id),
    )
    .where(
      and(
        eq(schema.classes.grade, student.grade),
        eq(schema.classes.section, student.section),
      ),
    )
    .limit(1);

  const rows = classRow
    ? await db
        .select({
          assessmentId: schema.assessments.id,
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
        .orderBy(asc(schema.subjects.name))
    : [];

  type SubjectAgg = {
    subjectId: string;
    subjectName: string;
    perTerm: Record<string, { weighted: number; weight: number }>;
  };

  const subjectMap = new Map<string, SubjectAgg>();
  for (const row of rows) {
    if (!subjectMap.has(row.subjectId)) {
      subjectMap.set(row.subjectId, {
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        perTerm: {},
      });
    }
    const agg = subjectMap.get(row.subjectId)!;
    if (!agg.perTerm[row.term]) {
      agg.perTerm[row.term] = { weighted: 0, weight: 0 };
    }
    if (row.score !== null && row.weight > 0 && row.maxScore > 0) {
      agg.perTerm[row.term].weighted +=
        (row.score / row.maxScore) * row.weight;
      agg.perTerm[row.term].weight += row.weight;
    }
  }

  const subjectsForCert = Array.from(subjectMap.values()).map((agg) => {
    const termPercents: Record<string, number | null> = {};
    let allWeighted = 0;
    let allWeight = 0;
    for (const term of TERMS) {
      const t = agg.perTerm[term];
      if (t && t.weight > 0) {
        termPercents[term] = Math.round((t.weighted / t.weight) * 100 * 10) / 10;
        allWeighted += t.weighted;
        allWeight += t.weight;
      } else {
        termPercents[term] = null;
      }
    }
    const overall = allWeight > 0
      ? Math.round((allWeighted / allWeight) * 100 * 10) / 10
      : null;
    return { ...agg, termPercents, overall };
  });

  const finalAvg = (() => {
    const values = subjectsForCert
      .map((s) => s.overall)
      .filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  })();
  const finalBand = bandFor(finalAvg);

  const issueDate = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    dateStyle: "long",
  }).format(new Date());

  return (
    <>
      <header className="topbar print-hide">
        <div>
          <h2 className="page-title">شهادة الطالبة</h2>
          <p className="page-subtitle">
            معاينة شهادة قابلة للطباعة. اضغطي زر الطباعة لتحويلها إلى PDF أو
            طباعتها.
          </p>
        </div>
        <div className="top-actions">
          <PrintButton />
          <Link
            className="ghost-button"
            href={`/grades/student/${student.id}`}
          >
            <ArrowRight size={16} strokeWidth={2} />
            رجوع للسجل
          </Link>
        </div>
      </header>

      <section className="certificate-sheet" aria-label="شهادة الطالبة">
        <div className="certificate-header">
          <div className="certificate-mark">أ.ح</div>
          <div>
            <h1>منصة أم حبيبة التعليمية</h1>
            <p>متوسطة أم حبيبة التعليمية — صبيا</p>
          </div>
          <div className="certificate-meta">
            <p>تاريخ الإصدار</p>
            <strong>{issueDate}</strong>
          </div>
        </div>

        <h2 className="certificate-title">شهادة درجات</h2>

        <dl className="certificate-info">
          <div>
            <dt>اسم الطالبة</dt>
            <dd>{student.fullName}</dd>
          </div>
          <div>
            <dt>رقم الهوية</dt>
            <dd className="mono">{student.nationalId}</dd>
          </div>
          <div>
            <dt>الصف والشعبة</dt>
            <dd>
              {student.grade} — {student.section}
            </dd>
          </div>
          <div>
            <dt>العام الدراسي</dt>
            <dd>{classRow?.academicYear ?? "—"}</dd>
          </div>
          <div>
            <dt>رائدة الفصل</dt>
            <dd>{classRow?.homeroomTeacherName ?? "—"}</dd>
          </div>
          <div>
            <dt>التقدير العام</dt>
            <dd>
              <span className={`pill tone-${finalBand.tone}`}>
                {finalAvg !== null
                  ? `${finalAvg}% · ${finalBand.label}`
                  : "غير مكتمل"}
              </span>
            </dd>
          </div>
        </dl>

        {subjectsForCert.length === 0 ? (
          <div className="empty-state">
            <h3>لا توجد بيانات تقييم</h3>
            <p>لا يمكن إصدار الشهادة قبل رصد الدرجات.</p>
          </div>
        ) : (
          <table className="data-table certificate-table">
            <thead>
              <tr>
                <th>المادة</th>
                {TERMS.map((t) => (
                  <th key={t}>{t}</th>
                ))}
                <th>المعدل العام</th>
                <th>التقدير</th>
              </tr>
            </thead>
            <tbody>
              {subjectsForCert.map((sub) => {
                const band = bandFor(sub.overall);
                return (
                  <tr key={sub.subjectId}>
                    <td>
                      <strong>{sub.subjectName}</strong>
                    </td>
                    {TERMS.map((t) => {
                      const v = sub.termPercents[t];
                      return (
                        <td key={t}>{v !== null ? `${v}%` : "—"}</td>
                      );
                    })}
                    <td>
                      <strong>
                        {sub.overall !== null ? `${sub.overall}%` : "—"}
                      </strong>
                    </td>
                    <td>
                      <span className={`pill tone-${band.tone}`}>
                        {band.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="certificate-signatures">
          <div>
            <p>توقيع رائدة الفصل</p>
            <span className="signature-line" />
            <strong>{classRow?.homeroomTeacherName ?? "—"}</strong>
          </div>
          <div>
            <p>ختم وتوقيع المديرة</p>
            <span className="signature-line" />
            <strong>المديرة</strong>
          </div>
        </div>

        <p className="certificate-footer">
          هذه الشهادة صادرة من منصة أم حبيبة التعليمية بتاريخ {issueDate} وتعكس
          الدرجات المرصودة حتى لحظة الطباعة.
        </p>
      </section>
    </>
  );
}
