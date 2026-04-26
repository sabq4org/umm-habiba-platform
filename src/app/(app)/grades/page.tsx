import {
  AlertTriangle,
  Award,
  BookMarked,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Plus,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, count, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { can, requirePermission } from "@/lib/permissions";
import { isUnrestricted, resolveSession, teacherClassIds } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function GradesIndexPage() {
  await requirePermission("grades.read");

  const session = await resolveSession();
  if (session?.role === "guardian") {
    if (session.studentRecordId) {
      redirect(`/grades/student/${session.studentRecordId}`);
    }
    redirect("/forbidden");
  }

  let allowedClassIds: Set<string> | null = null;
  if (session?.role === "teacher" && session.teacherRecordId) {
    allowedClassIds = await teacherClassIds(session.teacherRecordId);
  }
  const isScoped = !!allowedClassIds && !isUnrestricted(session?.role ?? "");

  const classesQueryBase = db
    .select({
      id: schema.classes.id,
      grade: schema.classes.grade,
      section: schema.classes.section,
      academicYear: schema.classes.academicYear,
    })
    .from(schema.classes)
    .$dynamic();
  const classesQueryFinal =
    isScoped && allowedClassIds
      ? allowedClassIds.size === 0
        ? null
        : classesQueryBase.where(
            inArray(schema.classes.id, [...allowedClassIds]),
          )
      : classesQueryBase;

  const [
    classesList,
    [assessmentsRow],
    [gradesRow],
    [studentsRow],
    perClassStats,
  ] = await Promise.all([
    classesQueryFinal
      ? classesQueryFinal.orderBy(
          asc(schema.classes.grade),
          asc(schema.classes.section),
        )
      : Promise.resolve([] as { id: string; grade: string; section: string; academicYear: string }[]),
    db
      .select({ total: count(schema.assessments.id) })
      .from(schema.assessments),
    db
      .select({ total: count(schema.studentGrades.id) })
      .from(schema.studentGrades),
    db.select({ total: count(schema.students.id) }).from(schema.students),
    db
      .select({
        classId: schema.assessments.classId,
        assessments: count(schema.assessments.id),
      })
      .from(schema.assessments)
      .groupBy(schema.assessments.classId),
  ]);

  const totalAssessments = Number(assessmentsRow?.total ?? 0);
  const totalGrades = Number(gradesRow?.total ?? 0);
  const studentsTotal = Number(studentsRow?.total ?? 0);

  const perClassMap = new Map(
    perClassStats.map((row) => [row.classId, Number(row.assessments)]),
  );

  const avgRow = await db
    .select({
      avg: sql<number>`AVG(${schema.studentGrades.score}::numeric / NULLIF(${schema.assessments.maxScore}, 0)::numeric * 100)`,
    })
    .from(schema.studentGrades)
    .innerJoin(
      schema.assessments,
      eq(schema.studentGrades.assessmentId, schema.assessments.id),
    );

  const avgPct = avgRow[0]?.avg ? Math.round(Number(avgRow[0].avg) * 10) / 10 : 0;

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <ClipboardCheck size={14} strokeWidth={2} />
            وحدة الدرجات والشهادات
          </p>
          <h2 className="page-title">الدرجات والشهادات</h2>
          <p className="page-subtitle">
            رصد التقييمات والاختبارات لكل مادة، احتساب الدرجات وتحويلها لمعدلات،
            وإصدار شهادة طالبة قابلة للطباعة.
          </p>
        </div>
        <div className="top-actions">
          {can(session?.role, "export.run") ? (
            <a
              className="ghost-button"
              href="/api/export/grades"
              title="تصدير CSV"
            >
              <Download size={16} strokeWidth={2} />
              تصدير CSV
            </a>
          ) : null}
        </div>
      </header>

      <section className="grid stats-grid" aria-label="ملخص الدرجات">
        <article className="card stat-card">
          <div className="stat-header">
            <span>التقييمات المعتمدة</span>
            <span className="icon-badge">
              <ClipboardCheck size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{totalAssessments}</div>
          <p className="stat-note">اختبارات وواجبات ومشاريع</p>
        </article>

        <article className="card stat-card tone-mint">
          <div className="stat-header">
            <span>درجات مرصودة</span>
            <span className="icon-badge tone-mint">
              <CheckCircle2 size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{totalGrades}</div>
          <p className="stat-note">من {studentsTotal} طالبة في النظام</p>
        </article>

        <article className="card stat-card">
          <div className="stat-header">
            <span>متوسط النسبة العامة</span>
            <span className="icon-badge">
              <Sparkles size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{avgPct}%</div>
          <p className="stat-note">على إجمالي الدرجات المرصودة</p>
        </article>

        <article className="card stat-card tone-rose">
          <div className="stat-header">
            <span>فصول بدون تقييمات</span>
            <span className="icon-badge tone-rose">
              <AlertTriangle size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">
            {classesList.filter((c) => !perClassMap.has(c.id)).length}
          </div>
          <p className="stat-note">يحتاج إعداد التقييمات</p>
        </article>
      </section>

      <section className="grid two-col">
        <article className="card">
          <div className="section-heading">
            <h2>اختاري فصلاً</h2>
            <span className="pill">{classesList.length} فصل</span>
          </div>
          {classesList.length === 0 ? (
            <div className="empty-state">
              <h3>{isScoped ? "لا فصول مسندة لكِ" : "لا توجد فصول بعد"}</h3>
              <p>
                {isScoped
                  ? "تواصلي مع الإدارة لإسناد جدول وحصص."
                  : "أضيفي فصلاً أولًا لتفعيل رصد الدرجات."}
              </p>
              {!isScoped ? (
                <Link className="button" href="/classes/new">
                  <Plus size={16} strokeWidth={2} />
                  إضافة فصل
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="schedule-list">
              {classesList.map((cls) => {
                const total = perClassMap.get(cls.id) ?? 0;
                return (
                  <li key={cls.id}>
                    <Link href={`/grades/class/${cls.id}`}>
                      <div>
                        <strong>
                          {cls.grade} — {cls.section}
                        </strong>
                        <span>{cls.academicYear}</span>
                      </div>
                      <span
                        className={`pill ${
                          total === 0 ? "tone-rose" : "tone-mint"
                        }`}
                      >
                        {total} تقييم
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>دلائل سريعة</h2>
            <Award size={18} strokeWidth={1.8} color="var(--accent-strong)" />
          </div>
          <ul className="quicklinks">
            <li>
              <Link href="/students" className="quicklink">
                <UserRound size={18} strokeWidth={1.8} />
                <div>
                  <strong>سجل طالبة</strong>
                  <span>افتحي ملف الطالبة لمشاهدة تقريرها</span>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/subjects" className="quicklink">
                <BookMarked size={18} strokeWidth={1.8} />
                <div>
                  <strong>المواد المعتمدة</strong>
                  <span>تأكدي من تعيين المعلمات قبل الرصد</span>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/classes" className="quicklink">
                <ClipboardCheck size={18} strokeWidth={1.8} />
                <div>
                  <strong>الفصول</strong>
                  <span>إدارة الفصول وقوائم الطالبات</span>
                </div>
              </Link>
            </li>
          </ul>
        </article>
      </section>
    </>
  );
}
