import {
  ArrowRight,
  BookMarked,
  CalendarClock,
  GraduationCap,
  IdCard,
  Pencil,
  Sigma,
  StickyNote,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const statusLabels: Record<string, string> = {
  active: "نشطة",
  archived: "مؤرشفة",
};

function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default async function SubjectProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [subject] = await db
    .select({
      id: schema.subjects.id,
      name: schema.subjects.name,
      code: schema.subjects.code,
      grade: schema.subjects.grade,
      weeklyPeriods: schema.subjects.weeklyPeriods,
      description: schema.subjects.description,
      status: schema.subjects.status,
      notes: schema.subjects.notes,
      createdAt: schema.subjects.createdAt,
      updatedAt: schema.subjects.updatedAt,
      teacherId: schema.subjects.teacherId,
      teacherName: schema.teachers.fullName,
      teacherSpecialty: schema.teachers.specialty,
      teacherEmail: schema.teachers.email,
    })
    .from(schema.subjects)
    .leftJoin(schema.teachers, eq(schema.subjects.teacherId, schema.teachers.id))
    .where(eq(schema.subjects.id, id))
    .limit(1);

  if (!subject) notFound();

  const statusLabel = statusLabels[subject.status] ?? subject.status;
  const statusTone = subject.status === "active" ? "good" : "warn";

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <BookMarked size={14} strokeWidth={2} />
            ملف المادة
          </p>
          <h2 className="page-title">{subject.name}</h2>
          <p className="page-subtitle">
            عرض كامل لبيانات المادة كما هي مسجلة في المنصة، الصف الذي تُدرّس له،
            النصاب الأسبوعي، والمعلمة المسؤولة.
          </p>
        </div>

        <div className="top-actions">
          <Link className="ghost-link" href="/subjects">
            <ArrowRight size={16} strokeWidth={2} />
            الرجوع للقائمة
          </Link>
          <Link className="button" href={`/subjects/${subject.id}/edit`}>
            <Pencil size={18} strokeWidth={2} />
            تعديل البيانات
          </Link>
        </div>
      </header>

      <section className="card profile-hero">
        <div className="profile-avatar">{subject.name.charAt(0)}</div>
        <div className="profile-hero-body">
          <div className="profile-hero-row">
            <h3>{subject.name}</h3>
            <span className={`status ${statusTone}`}>{statusLabel}</span>
          </div>
          <div className="profile-meta">
            <span>
              <IdCard size={16} strokeWidth={1.8} />
              <span className="mono">{subject.code ?? "بدون رمز"}</span>
            </span>
            <span>
              <GraduationCap size={16} strokeWidth={1.8} />
              {subject.grade}
            </span>
            <span>
              <Sigma size={16} strokeWidth={1.8} />
              {subject.weeklyPeriods} حصة / أسبوع
            </span>
          </div>
        </div>
      </section>

      <section className="grid profile-grid">
        <article className="card">
          <div className="section-heading">
            <h2>بيانات المادة</h2>
            <span className="pill">أساسي</span>
          </div>

          <dl className="info-list">
            <div>
              <dt>
                <BookMarked size={16} strokeWidth={1.8} />
                الاسم
              </dt>
              <dd>{subject.name}</dd>
            </div>
            <div>
              <dt>
                <IdCard size={16} strokeWidth={1.8} />
                الرمز
              </dt>
              <dd className="mono">{subject.code ?? "—"}</dd>
            </div>
            <div>
              <dt>
                <GraduationCap size={16} strokeWidth={1.8} />
                الصف
              </dt>
              <dd>{subject.grade}</dd>
            </div>
            <div>
              <dt>
                <CalendarClock size={16} strokeWidth={1.8} />
                الحصص الأسبوعية
              </dt>
              <dd>{subject.weeklyPeriods}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>المعلمة المسؤولة</h2>
            <UserRound size={18} strokeWidth={1.8} color="var(--accent-strong)" />
          </div>

          {subject.teacherId && subject.teacherName ? (
            <dl className="info-list">
              <div>
                <dt>
                  <UserRound size={16} strokeWidth={1.8} />
                  الاسم
                </dt>
                <dd>
                  <Link
                    className="row-link"
                    href={`/teachers/${subject.teacherId}`}
                  >
                    {subject.teacherName}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>التخصص</dt>
                <dd>{subject.teacherSpecialty ?? "—"}</dd>
              </div>
              <div>
                <dt>البريد الإلكتروني</dt>
                <dd className="mono" dir="ltr">
                  {subject.teacherEmail ?? "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="empty-state">
              <h3>لم يتم تعيين معلمة</h3>
              <p>يمكن تعيين المعلمة المسؤولة من زر تعديل البيانات.</p>
            </div>
          )}
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>الوصف</h2>
            <span className="pill tone-mint">منهج</span>
          </div>
          {subject.description ? (
            <p className="notes-text">{subject.description}</p>
          ) : (
            <div className="empty-state">
              <h3>لم يتم إضافة وصف</h3>
              <p>يمكن كتابة ملخص المادة من زر تعديل البيانات.</p>
            </div>
          )}
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>ملاحظات</h2>
            <StickyNote size={18} strokeWidth={1.8} color="var(--accent-strong)" />
          </div>
          {subject.notes ? (
            <p className="notes-text">{subject.notes}</p>
          ) : (
            <div className="empty-state">
              <h3>لا توجد ملاحظات</h3>
              <p>يمكن إضافة ملاحظات تخص هذه المادة من زر التعديل.</p>
            </div>
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
              <dd>{formatDate(subject.createdAt)}</dd>
            </div>
            <div>
              <dt>آخر تحديث</dt>
              <dd>{formatDate(subject.updatedAt)}</dd>
            </div>
            <div>
              <dt>المعرف</dt>
              <dd className="mono">{subject.id}</dd>
            </div>
          </dl>
        </article>
      </section>
    </>
  );
}
