import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Cake,
  Droplet,
  Globe,
  GraduationCap,
  Heart,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldAlert,
  StickyNote,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, count, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { guardianCanAccessStudent, resolveSession } from "@/lib/scope";
import { bandFor } from "../../grades/constants";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function formatDay(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "long" }).format(date);
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years -= 1;
  return years;
}

function statusLabel(status: string): { label: string; tone: "good" | "warn" } {
  if (status === "active") return { label: "فعّالة", tone: "good" };
  return { label: status, tone: "warn" };
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("students.read");
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    notFound();
  }

  const session = await resolveSession();
  if (session && !guardianCanAccessStudent(session, id)) {
    redirect("/forbidden");
  }
  const canEdit = session?.role === "admin" || session?.role === "staff";

  const [student] = await db
    .select()
    .from(schema.students)
    .where(eq(schema.students.id, id))
    .limit(1);

  if (!student) {
    notFound();
  }

  const status = statusLabel(student.status);

  const attendanceBreakdown = await db
    .select({
      status: schema.attendanceRecords.status,
      total: count(schema.attendanceRecords.id),
    })
    .from(schema.attendanceRecords)
    .where(eq(schema.attendanceRecords.studentId, student.id))
    .groupBy(schema.attendanceRecords.status);

  const attMap = new Map(
    attendanceBreakdown.map((row) => [row.status, Number(row.total)]),
  );
  const attTotal = Array.from(attMap.values()).reduce((s, v) => s + v, 0);
  const attPresent = attMap.get("present") ?? 0;
  const attAbsent = attMap.get("absent") ?? 0;
  const attLate = attMap.get("late") ?? 0;
  const attExcused = attMap.get("excused") ?? 0;
  const attPct =
    attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

  const gradesSummary = await db
    .select({
      assessmentsCount: count(schema.assessments.id),
      gradedCount: sql<number>`COUNT(${schema.studentGrades.id})`,
      avgPct: sql<number>`AVG(${schema.studentGrades.score}::numeric / NULLIF(${schema.assessments.maxScore}, 0)::numeric * 100)`,
    })
    .from(schema.assessments)
    .innerJoin(
      schema.classes,
      eq(schema.assessments.classId, schema.classes.id),
    )
    .leftJoin(
      schema.studentGrades,
      and(
        eq(schema.studentGrades.assessmentId, schema.assessments.id),
        eq(schema.studentGrades.studentId, student.id),
      ),
    )
    .where(
      and(
        eq(schema.classes.grade, student.grade),
        eq(schema.classes.section, student.section),
      ),
    );

  const gradeStats = gradesSummary[0];
  const totalAssessments = Number(gradeStats?.assessmentsCount ?? 0);
  const gradedCount = Number(gradeStats?.gradedCount ?? 0);
  const avgPctRaw = gradeStats?.avgPct ? Number(gradeStats.avgPct) : null;
  const avgPct = avgPctRaw !== null ? Math.round(avgPctRaw * 10) / 10 : null;
  const gradeBand = bandFor(avgPct);

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <GraduationCap size={14} strokeWidth={2} />
            ملف الطالبة
          </p>
          <h2 className="page-title">{student.fullName}</h2>
          <p className="page-subtitle">
            عرض كامل لبيانات الطالبة كما هي مسجلة في المنصة. الأقسام التي ليست متصلة بعد
            ستفعّل في المراحل القادمة (الدرجات، الحضور، الشهادات).
          </p>
        </div>

        <div className="top-actions">
          <Link className="ghost-link" href="/students">
            <ArrowRight size={16} strokeWidth={2} />
            الرجوع للقائمة
          </Link>
          {canEdit ? (
            <Link className="button" href={`/students/${student.id}/edit`}>
              <Pencil size={18} strokeWidth={2} />
              تعديل البيانات
            </Link>
          ) : null}
        </div>
      </header>

      <section className="card profile-hero">
        <div className="profile-avatar">
          {student.fullName.charAt(0)}
        </div>
        <div className="profile-hero-body">
          <div className="profile-hero-row">
            <h3>{student.fullName}</h3>
            <span className={`status ${status.tone}`}>{status.label}</span>
          </div>
          <div className="profile-meta">
            <span>
              <IdCard size={16} strokeWidth={1.8} />
              <span className="mono">{student.nationalId}</span>
            </span>
            <span>
              <BookOpen size={16} strokeWidth={1.8} />
              {student.grade}
            </span>
            <span>
              <Users size={16} strokeWidth={1.8} />
              شعبة {student.section}
            </span>
          </div>
        </div>
      </section>

      <section className="grid profile-grid">
        <article className="card">
          <div className="section-heading">
            <h2>البيانات الأساسية</h2>
            <span className="pill">حساسة</span>
          </div>

          <dl className="info-list">
            <div>
              <dt>
                <UserRound size={16} strokeWidth={1.8} />
                الاسم الكامل
              </dt>
              <dd>{student.fullName}</dd>
            </div>
            <div>
              <dt>
                <IdCard size={16} strokeWidth={1.8} />
                رقم الهوية
              </dt>
              <dd className="mono">{student.nationalId}</dd>
            </div>
            <div>
              <dt>
                <Cake size={16} strokeWidth={1.8} />
                تاريخ الميلاد
              </dt>
              <dd>
                {formatDay(student.dateOfBirth)}
                {ageFromDob(student.dateOfBirth) !== null
                  ? ` (${ageFromDob(student.dateOfBirth)} سنة)`
                  : ""}
              </dd>
            </div>
            <div>
              <dt>
                <Globe size={16} strokeWidth={1.8} />
                الجنسية
              </dt>
              <dd>{student.nationality ?? "—"}</dd>
            </div>
            <div>
              <dt>
                <Droplet size={16} strokeWidth={1.8} />
                فصيلة الدم
              </dt>
              <dd>{student.bloodType ?? "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>الشأن الأكاديمي</h2>
            <span className="pill">دراسي</span>
          </div>

          <dl className="info-list">
            <div>
              <dt>
                <BookOpen size={16} strokeWidth={1.8} />
                الصف
              </dt>
              <dd>{student.grade}</dd>
            </div>
            <div>
              <dt>
                <Users size={16} strokeWidth={1.8} />
                الشعبة
              </dt>
              <dd>{student.section}</dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={16} strokeWidth={1.8} />
                تاريخ الالتحاق
              </dt>
              <dd>{formatDay(student.enrollmentDate)}</dd>
            </div>
            <div>
              <dt>
                <GraduationCap size={16} strokeWidth={1.8} />
                المدرسة السابقة
              </dt>
              <dd>{student.previousSchool ?? "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>بيانات التواصل</h2>
            <span className="pill tone-mint">للتواصل</span>
          </div>

          <dl className="info-list">
            <div>
              <dt>
                <Phone size={16} strokeWidth={1.8} />
                جوال الطالبة
              </dt>
              <dd className="mono">{student.phone ?? "—"}</dd>
            </div>
            <div>
              <dt>
                <Mail size={16} strokeWidth={1.8} />
                البريد الإلكتروني
              </dt>
              <dd className="mono">{student.email ?? "—"}</dd>
            </div>
            <div>
              <dt>
                <MapPin size={16} strokeWidth={1.8} />
                العنوان
              </dt>
              <dd>{student.address ?? "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>ولي الأمر</h2>
            <span className="pill tone-mint">للتواصل</span>
          </div>

          <dl className="info-list">
            <div>
              <dt>
                <UserRound size={16} strokeWidth={1.8} />
                الاسم
              </dt>
              <dd>{student.guardianName ?? "—"}</dd>
            </div>
            <div>
              <dt>
                <Phone size={16} strokeWidth={1.8} />
                الجوال
              </dt>
              <dd className="mono">{student.guardianPhone ?? "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>جهة الاتصال للطوارئ</h2>
            <ShieldAlert
              size={18}
              strokeWidth={1.8}
              color="var(--accent-strong)"
            />
          </div>

          <dl className="info-list">
            <div>
              <dt>
                <UserRound size={16} strokeWidth={1.8} />
                الاسم
              </dt>
              <dd>{student.emergencyContactName ?? "—"}</dd>
            </div>
            <div>
              <dt>
                <Phone size={16} strokeWidth={1.8} />
                الجوال
              </dt>
              <dd className="mono">{student.emergencyContactPhone ?? "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>البيانات الصحية</h2>
            <Heart size={18} strokeWidth={1.8} color="var(--accent-strong)" />
          </div>

          <dl className="info-list">
            <div>
              <dt>
                <Droplet size={16} strokeWidth={1.8} />
                فصيلة الدم
              </dt>
              <dd>{student.bloodType ?? "—"}</dd>
            </div>
            <div>
              <dt>
                <Heart size={16} strokeWidth={1.8} />
                أمراض مزمنة
              </dt>
              <dd>{student.chronicDiseases ?? "—"}</dd>
            </div>
            <div>
              <dt>
                <ShieldAlert size={16} strokeWidth={1.8} />
                الحساسية
              </dt>
              <dd>{student.allergies ?? "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="card field-full">
          <div className="section-heading">
            <h2>ملاحظات</h2>
            <StickyNote size={18} strokeWidth={1.8} color="var(--accent-strong)" />
          </div>

          {student.notes ? (
            <p className="notes-text">{student.notes}</p>
          ) : (
            <div className="empty-state">
              <h3>لا توجد ملاحظات بعد</h3>
              <p>يمكنك إضافة ملاحظات إدارية أو تربوية من زر تعديل البيانات.</p>
            </div>
          )}
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>الدرجات</h2>
            <Link
              href={`/grades/student/${student.id}`}
              className="ghost-link"
            >
              <ClipboardCheck size={14} strokeWidth={2} />
              السجل الكامل
            </Link>
          </div>
          {totalAssessments === 0 ? (
            <div className="placeholder">
              <ClipboardCheck size={28} strokeWidth={1.6} />
              <p>لا توجد تقييمات لهذا الفصل بعد.</p>
            </div>
          ) : (
            <>
              <div className="profile-progress">
                <div className="profile-progress-label">
                  <span>المعدل العام</span>
                  <strong>{avgPct !== null ? `${avgPct}%` : "—"}</strong>
                </div>
                <div className="profile-progress-bar">
                  <div
                    className="profile-progress-fill"
                    style={{ width: `${avgPct ?? 0}%` }}
                  />
                </div>
                <p className="muted-text">
                  {gradedCount} درجة مرصودة من أصل {totalAssessments} تقييم
                </p>
              </div>
              <div className="legend-row">
                <span className={`pill tone-${gradeBand.tone}`}>
                  {gradeBand.label}
                </span>
                <Link
                  className="ghost-button"
                  href={`/grades/student/${student.id}/certificate`}
                >
                  <Award size={14} strokeWidth={2} />
                  عرض الشهادة
                </Link>
              </div>
            </>
          )}
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>الحضور والغياب</h2>
            <Link
              href={`/attendance/student/${student.id}`}
              className="ghost-link"
            >
              <CalendarDays size={14} strokeWidth={2} />
              السجل الكامل
            </Link>
          </div>
          {attTotal === 0 ? (
            <div className="placeholder">
              <CalendarDays size={28} strokeWidth={1.6} />
              <p>لم تُسجل أي حصة لهذه الطالبة بعد.</p>
            </div>
          ) : (
            <>
              <div className="profile-progress">
                <div className="profile-progress-label">
                  <span>نسبة الحضور</span>
                  <strong>{attPct}%</strong>
                </div>
                <div className="profile-progress-bar">
                  <div
                    className="profile-progress-fill"
                    style={{ width: `${attPct}%` }}
                  />
                </div>
                <p className="muted-text">
                  {attPresent} حاضرة من أصل {attTotal} حصة مسجلة
                </p>
              </div>
              <div className="legend-row">
                <span className="pill tone-mint">حاضرات: {attPresent}</span>
                <span className="pill tone-rose">غائبات: {attAbsent}</span>
                <span className="pill tone-amber">متأخرات: {attLate}</span>
                <span className="pill">بعذر: {attExcused}</span>
              </div>
            </>
          )}
        </article>

        <article className="card field-full">
          <div className="section-heading">
            <h2>سجل النظام</h2>
            <span className="pill">معلومات تقنية</span>
          </div>
          <dl className="info-list two-col">
            <div>
              <dt>تاريخ الإضافة</dt>
              <dd>{formatDate(student.createdAt)}</dd>
            </div>
            <div>
              <dt>آخر تحديث</dt>
              <dd>{formatDate(student.updatedAt)}</dd>
            </div>
            <div>
              <dt>المعرف</dt>
              <dd className="mono">{student.id}</dd>
            </div>
          </dl>
        </article>
      </section>
    </>
  );
}
