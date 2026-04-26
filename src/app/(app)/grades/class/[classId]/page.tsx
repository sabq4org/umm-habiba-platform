import {
  ArrowRight,
  BookMarked,
  ClipboardCheck,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { isUnrestricted, resolveSession, teacherClassIds } from "@/lib/scope";
import { bandFor } from "../../constants";

export const dynamic = "force-dynamic";

export default async function GradesClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  await requirePermission("grades.read");
  const { classId } = await params;
  const session = await resolveSession();
  if (session && !isUnrestricted(session.role)) {
    if (session.role === "teacher" && session.teacherRecordId) {
      const allowed = await teacherClassIds(session.teacherRecordId);
      if (!allowed.has(classId)) redirect("/forbidden");
    } else {
      redirect("/forbidden");
    }
  }

  const [cls] = await db
    .select({
      id: schema.classes.id,
      grade: schema.classes.grade,
      section: schema.classes.section,
      academicYear: schema.classes.academicYear,
    })
    .from(schema.classes)
    .where(eq(schema.classes.id, classId))
    .limit(1);

  if (!cls) return notFound();

  const subjectsList = await db
    .select({
      id: schema.subjects.id,
      name: schema.subjects.name,
      code: schema.subjects.code,
      weeklyPeriods: schema.subjects.weeklyPeriods,
      teacherName: schema.teachers.fullName,
    })
    .from(schema.subjects)
    .leftJoin(
      schema.teachers,
      eq(schema.subjects.teacherId, schema.teachers.id),
    )
    .where(eq(schema.subjects.grade, cls.grade))
    .orderBy(asc(schema.subjects.name));

  const studentsList = await db
    .select({ id: schema.students.id })
    .from(schema.students)
    .where(
      and(
        eq(schema.students.grade, cls.grade),
        eq(schema.students.section, cls.section),
      ),
    );
  const studentsCount = studentsList.length;

  const subjectStats = await db
    .select({
      subjectId: schema.assessments.subjectId,
      assessments: count(schema.assessments.id),
      avg: sql<number>`AVG(${schema.studentGrades.score}::numeric / NULLIF(${schema.assessments.maxScore}, 0)::numeric * 100)`,
      graded: count(schema.studentGrades.id),
    })
    .from(schema.assessments)
    .leftJoin(
      schema.studentGrades,
      eq(schema.studentGrades.assessmentId, schema.assessments.id),
    )
    .where(eq(schema.assessments.classId, classId))
    .groupBy(schema.assessments.subjectId);

  const statsMap = new Map(
    subjectStats.map((row) => [
      row.subjectId,
      {
        assessments: Number(row.assessments),
        graded: Number(row.graded),
        avg:
          row.avg !== null && row.avg !== undefined
            ? Math.round(Number(row.avg) * 10) / 10
            : null,
      },
    ]),
  );

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <ClipboardCheck size={14} strokeWidth={2} />
            درجات الفصل
          </p>
          <h2 className="page-title">
            {cls.grade} — {cls.section}
          </h2>
          <p className="page-subtitle">
            {cls.academicYear} · {studentsCount} طالبة · {subjectsList.length}{" "}
            مادة معتمدة لهذا الصف
          </p>
        </div>
        <div className="top-actions">
          <Link className="ghost-button" href={`/classes/${cls.id}`}>
            <GraduationCap size={16} strokeWidth={2} />
            ملف الفصل
          </Link>
          <Link className="ghost-button" href="/grades">
            <ArrowRight size={16} strokeWidth={2} />
            رجوع
          </Link>
        </div>
      </header>

      {studentsCount === 0 && (
        <div className="notice tone-rose">
          لا توجد طالبات مسجلات في هذا الفصل بعد، يجب إضافتهن قبل رصد الدرجات.
        </div>
      )}

      <article className="card">
        <div className="section-heading">
          <h2>المواد المعتمدة</h2>
          <span className="pill">{subjectsList.length} مادة</span>
        </div>

        {subjectsList.length === 0 ? (
          <div className="empty-state">
            <h3>لا توجد مواد معتمدة لهذا الصف</h3>
            <p>أضيفي المواد من وحدة المواد قبل بدء التقييم.</p>
            <Link className="button" href="/subjects/new">
              إضافة مادة
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>المادة</th>
                <th>المعلمة</th>
                <th>التقييمات</th>
                <th>المتوسط</th>
                <th>الدرجات المرصودة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {subjectsList.map((sub) => {
                const stats = statsMap.get(sub.id);
                const band = bandFor(stats?.avg ?? null);
                return (
                  <tr key={sub.id}>
                    <td>
                      <Link
                        className="row-link"
                        href={`/grades/class/${cls.id}/subject/${sub.id}`}
                      >
                        <BookMarked size={14} strokeWidth={2} />
                        <strong>{sub.name}</strong>
                      </Link>
                      {sub.code && (
                        <span className="muted-text">{sub.code}</span>
                      )}
                    </td>
                    <td>{sub.teacherName ?? "—"}</td>
                    <td>{stats?.assessments ?? 0}</td>
                    <td>
                      <span className={`pill tone-${band.tone}`}>
                        {stats?.avg !== null && stats?.avg !== undefined
                          ? `${stats.avg}% · ${band.label}`
                          : "—"}
                      </span>
                    </td>
                    <td>{stats?.graded ?? 0}</td>
                    <td>
                      <Link
                        className="ghost-button"
                        href={`/grades/class/${cls.id}/subject/${sub.id}`}
                      >
                        تقييمات
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>
    </>
  );
}
