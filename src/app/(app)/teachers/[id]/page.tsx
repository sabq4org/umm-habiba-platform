import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  CalendarDays,
  IdCard,
  Mail,
  Pencil,
  Phone,
  StickyNote,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const statusLabels: Record<string, string> = {
  active: "على رأس العمل",
  leave: "في إجازة",
  transferred: "منقولة",
  resigned: "مستقيلة",
};

function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("teachers.read");
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    notFound();
  }

  const [teacher] = await db
    .select()
    .from(schema.teachers)
    .where(eq(schema.teachers.id, id))
    .limit(1);

  if (!teacher) {
    notFound();
  }

  const statusLabel = statusLabels[teacher.status] ?? teacher.status;
  const statusTone = teacher.status === "active" ? "good" : "warn";

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <UserRound size={14} strokeWidth={2} />
            ملف المعلمة
          </p>
          <h2 className="page-title">{teacher.fullName}</h2>
          <p className="page-subtitle">
            عرض كامل لبيانات المعلمة كما هي مسجلة في المنصة. أقسام الجدول والتقييمات
            والزيارات الإشرافية ستفعّل في المراحل القادمة.
          </p>
        </div>

        <div className="top-actions">
          <Link className="ghost-link" href="/teachers">
            <ArrowRight size={16} strokeWidth={2} />
            الرجوع للقائمة
          </Link>
          <Link
            className="ghost-link"
            href={`/schedules/teacher/${teacher.id}`}
          >
            <CalendarDays size={16} strokeWidth={2} />
            عرض الجدول
          </Link>
          <Link className="button" href={`/teachers/${teacher.id}/edit`}>
            <Pencil size={18} strokeWidth={2} />
            تعديل البيانات
          </Link>
        </div>
      </header>

      <section className="card profile-hero">
        <div className="profile-avatar">{teacher.fullName.charAt(0)}</div>
        <div className="profile-hero-body">
          <div className="profile-hero-row">
            <h3>{teacher.fullName}</h3>
            <span className={`status ${statusTone}`}>{statusLabel}</span>
          </div>
          <div className="profile-meta">
            <span>
              <IdCard size={16} strokeWidth={1.8} />
              <span className="mono">{teacher.nationalId}</span>
            </span>
            <span>
              <BookOpen size={16} strokeWidth={1.8} />
              {teacher.specialty}
            </span>
            <span>
              <GraduationCap size={16} strokeWidth={1.8} />
              {teacher.yearsOfService} سنة خدمة
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
              <dd>{teacher.fullName}</dd>
            </div>
            <div>
              <dt>
                <IdCard size={16} strokeWidth={1.8} />
                رقم الهوية
              </dt>
              <dd className="mono">{teacher.nationalId}</dd>
            </div>
            <div>
              <dt>
                <BookOpen size={16} strokeWidth={1.8} />
                التخصص
              </dt>
              <dd>{teacher.specialty}</dd>
            </div>
            <div>
              <dt>
                <GraduationCap size={16} strokeWidth={1.8} />
                المؤهل العلمي
              </dt>
              <dd>{teacher.qualification ?? "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>النصاب والمواد</h2>
            <span className="pill tone-mint">أكاديمي</span>
          </div>

          <dl className="info-list">
            <div>
              <dt>
                <ClipboardCheck size={16} strokeWidth={1.8} />
                النصاب الأسبوعي
              </dt>
              <dd>{teacher.weeklyLoad} حصة</dd>
            </div>
            <div>
              <dt>
                <BookOpen size={16} strokeWidth={1.8} />
                المواد التي تدرّسها
              </dt>
              <dd>{teacher.subjects ?? "—"}</dd>
            </div>
            <div>
              <dt>
                <GraduationCap size={16} strokeWidth={1.8} />
                سنوات الخدمة
              </dt>
              <dd>{teacher.yearsOfService}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>التواصل</h2>
            <Mail size={18} strokeWidth={1.8} color="var(--accent-strong)" />
          </div>
          <dl className="info-list">
            <div>
              <dt>
                <Phone size={16} strokeWidth={1.8} />
                الجوال
              </dt>
              <dd className="mono">{teacher.phone ?? "—"}</dd>
            </div>
            <div>
              <dt>
                <Mail size={16} strokeWidth={1.8} />
                البريد الإلكتروني
              </dt>
              <dd className="mono" dir="ltr">
                {teacher.email ?? "—"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>ملاحظات</h2>
            <StickyNote size={18} strokeWidth={1.8} color="var(--accent-strong)" />
          </div>

          {teacher.notes ? (
            <p className="notes-text">{teacher.notes}</p>
          ) : (
            <div className="empty-state">
              <h3>لا توجد ملاحظات بعد</h3>
              <p>يمكن إضافة ملاحظات إدارية من زر تعديل البيانات.</p>
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
              <dd>{formatDate(teacher.createdAt)}</dd>
            </div>
            <div>
              <dt>آخر تحديث</dt>
              <dd>{formatDate(teacher.updatedAt)}</dd>
            </div>
            <div>
              <dt>المعرف</dt>
              <dd className="mono">{teacher.id}</dd>
            </div>
          </dl>
        </article>
      </section>
    </>
  );
}
