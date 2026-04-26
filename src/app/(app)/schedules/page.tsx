import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { db, schema } from "@/db";
import { can, requirePermission } from "@/lib/permissions";
import { resolveSession } from "@/lib/scope";
import { redirect } from "next/navigation";
import { TOTAL_PERIODS } from "./constants";

export const dynamic = "force-dynamic";

export default async function SchedulesIndexPage() {
  await requirePermission("schedules.read");
  const session = await resolveSession();
  if (session?.role === "teacher" && session.teacherRecordId) {
    redirect(`/schedules/teacher/${session.teacherRecordId}`);
  }
  const canEdit = can(session?.role, "schedules.write");
  const [classesList, teachersList, [totalRow]] = await Promise.all([
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
        id: schema.teachers.id,
        fullName: schema.teachers.fullName,
        specialty: schema.teachers.specialty,
      })
      .from(schema.teachers)
      .orderBy(asc(schema.teachers.fullName)),
    db
      .select({ total: count(schema.scheduleEntries.id) })
      .from(schema.scheduleEntries),
  ]);

  const classCounts = await db
    .select({
      classId: schema.scheduleEntries.classId,
      total: count(schema.scheduleEntries.id),
    })
    .from(schema.scheduleEntries)
    .groupBy(schema.scheduleEntries.classId);

  const classCountMap = new Map(
    classCounts.map((row) => [row.classId, Number(row.total)]),
  );

  const teacherCounts = await db
    .select({
      teacherId: schema.scheduleEntries.teacherId,
      total: count(schema.scheduleEntries.id),
    })
    .from(schema.scheduleEntries)
    .groupBy(schema.scheduleEntries.teacherId);

  const teacherCountMap = new Map(
    teacherCounts
      .filter((row) => row.teacherId)
      .map((row) => [row.teacherId as string, Number(row.total)]),
  );

  const totalPeriods = Number(totalRow?.total ?? 0);
  const totalSlots = classesList.length * 5 * TOTAL_PERIODS;
  const fillPct = totalSlots > 0 ? Math.round((totalPeriods / totalSlots) * 100) : 0;

  const classesWithoutSchedule = classesList.filter(
    (cls) => !classCountMap.has(cls.id),
  ).length;

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <CalendarDays size={14} strokeWidth={2} />
            وحدة الجداول الدراسية
          </p>
          <h2 className="page-title">الجداول الدراسية</h2>
          <p className="page-subtitle">
            تصفح جداول الفصول والمعلمات. كل حصة تربط فصلًا بمادة ومعلمة في يوم وحصة
            محددة. النظام يمنع تعارض جدول الفصل وجدول المعلمة تلقائيًا.
          </p>
        </div>

        <div className="top-actions">
          {canEdit ? (
            <Link className="button" href="/schedules/new">
              <Plus size={18} strokeWidth={2} />
              إضافة حصة
            </Link>
          ) : null}
        </div>
      </header>

      <section className="grid stats-grid" aria-label="ملخص الجداول">
        <article className="card stat-card">
          <div className="stat-header">
            <span>إجمالي الحصص</span>
            <span className="icon-badge">
              <Clock size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{totalPeriods}</div>
          <p className="stat-note">من {totalSlots} خانة ممكنة</p>
        </article>

        <article className="card stat-card tone-mint">
          <div className="stat-header">
            <span>نسبة التغطية</span>
            <span className="icon-badge tone-mint">
              <CheckCircle2 size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{fillPct}%</div>
          <p className="stat-note">امتلاء الجداول الكلي</p>
        </article>

        <article className="card stat-card tone-rose">
          <div className="stat-header">
            <span>فصول بدون جدول</span>
            <span className="icon-badge tone-rose">
              <AlertTriangle size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{classesWithoutSchedule}</div>
          <p className="stat-note">يحتاج إعداد جدول كامل</p>
        </article>

        <article className="card stat-card">
          <div className="stat-header">
            <span>معلمات لديهن جدول</span>
            <span className="icon-badge">
              <UserRound size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="stat-value">{teacherCountMap.size}</div>
          <p className="stat-note">من {teachersList.length} معلمة</p>
        </article>
      </section>

      <section className="grid two-col">
        <article className="card">
          <div className="section-heading">
            <h2>جداول الفصول</h2>
            <span className="pill">{classesList.length} فصل</span>
          </div>

          {classesList.length === 0 ? (
            <div className="empty-state">
              <h3>لا توجد فصول مسجلة</h3>
              <p>أضيفي الفصول أولاً من وحدة الفصول.</p>
              <Link className="button" href="/classes/new">
                إضافة فصل
              </Link>
            </div>
          ) : (
            <ul className="schedule-list">
              {classesList.map((cls) => {
                const periods = classCountMap.get(cls.id) ?? 0;
                return (
                  <li key={cls.id}>
                    <Link href={`/schedules/class/${cls.id}`}>
                      <div>
                        <strong>
                          {cls.grade} — {cls.section}
                        </strong>
                        <span>{cls.academicYear}</span>
                      </div>
                      <span className={`pill ${periods === 0 ? "tone-rose" : "tone-mint"}`}>
                        {periods} حصة
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
            <h2>جداول المعلمات</h2>
            <span className="pill">{teachersList.length} معلمة</span>
          </div>

          {teachersList.length === 0 ? (
            <div className="empty-state">
              <h3>لا توجد معلمات مسجلة</h3>
              <p>أضيفي المعلمات أولاً من وحدة المعلمات.</p>
              <Link className="button" href="/teachers/new">
                إضافة معلمة
              </Link>
            </div>
          ) : (
            <ul className="schedule-list">
              {teachersList.map((teacher) => {
                const periods = teacherCountMap.get(teacher.id) ?? 0;
                return (
                  <li key={teacher.id}>
                    <Link href={`/schedules/teacher/${teacher.id}`}>
                      <div>
                        <strong>{teacher.fullName}</strong>
                        <span>{teacher.specialty}</span>
                      </div>
                      <span className={`pill ${periods === 0 ? "tone-rose" : "tone-mint"}`}>
                        {periods} حصة
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </section>
    </>
  );
}
