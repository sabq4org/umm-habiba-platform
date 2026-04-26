import {
  ArrowRight,
  Briefcase,
  Building2,
  GraduationCap,
  IdCard,
  ListChecks,
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

export default async function AdminProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("admins.read");
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    notFound();
  }

  const [admin] = await db
    .select()
    .from(schema.admins)
    .where(eq(schema.admins.id, id))
    .limit(1);

  if (!admin) {
    notFound();
  }

  const statusLabel = statusLabels[admin.status] ?? admin.status;
  const statusTone = admin.status === "active" ? "good" : "warn";

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <Briefcase size={14} strokeWidth={2} />
            ملف الإدارية
          </p>
          <h2 className="page-title">{admin.fullName}</h2>
          <p className="page-subtitle">
            عرض كامل لبيانات الإدارية كما هي مسجلة في المنصة. أقسام السجل والملاحظات
            المعتمدة ستفعّل في المراحل القادمة.
          </p>
        </div>

        <div className="top-actions">
          <Link className="ghost-link" href="/admins">
            <ArrowRight size={16} strokeWidth={2} />
            الرجوع للقائمة
          </Link>
          <Link className="button" href={`/admins/${admin.id}/edit`}>
            <Pencil size={18} strokeWidth={2} />
            تعديل البيانات
          </Link>
        </div>
      </header>

      <section className="card profile-hero">
        <div className="profile-avatar">{admin.fullName.charAt(0)}</div>
        <div className="profile-hero-body">
          <div className="profile-hero-row">
            <h3>{admin.fullName}</h3>
            <span className={`status ${statusTone}`}>{statusLabel}</span>
          </div>
          <div className="profile-meta">
            <span>
              <IdCard size={16} strokeWidth={1.8} />
              <span className="mono">{admin.nationalId}</span>
            </span>
            <span>
              <Briefcase size={16} strokeWidth={1.8} />
              {admin.jobTitle}
            </span>
            <span>
              <Building2 size={16} strokeWidth={1.8} />
              {admin.department}
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
              <dd>{admin.fullName}</dd>
            </div>
            <div>
              <dt>
                <IdCard size={16} strokeWidth={1.8} />
                رقم الهوية
              </dt>
              <dd className="mono">{admin.nationalId}</dd>
            </div>
            <div>
              <dt>
                <GraduationCap size={16} strokeWidth={1.8} />
                المؤهل العلمي
              </dt>
              <dd>{admin.qualification ?? "—"}</dd>
            </div>
            <div>
              <dt>
                <GraduationCap size={16} strokeWidth={1.8} />
                سنوات الخدمة
              </dt>
              <dd>{admin.yearsOfService}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>القسم والمهام</h2>
            <span className="pill tone-mint">إداري</span>
          </div>

          <dl className="info-list">
            <div>
              <dt>
                <Briefcase size={16} strokeWidth={1.8} />
                المسمى الوظيفي
              </dt>
              <dd>{admin.jobTitle}</dd>
            </div>
            <div>
              <dt>
                <Building2 size={16} strokeWidth={1.8} />
                القسم
              </dt>
              <dd>{admin.department}</dd>
            </div>
          </dl>

          <div className="section-heading" style={{ marginTop: 18 }}>
            <h2>المهام</h2>
            <ListChecks size={18} strokeWidth={1.8} color="var(--accent-strong)" />
          </div>
          {admin.responsibilities ? (
            <p className="notes-text">{admin.responsibilities}</p>
          ) : (
            <div className="empty-state">
              <h3>لم يتم تحديد المهام</h3>
              <p>أضيفي تفاصيل المهام المسندة من زر تعديل البيانات.</p>
            </div>
          )}
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
              <dd className="mono">{admin.phone ?? "—"}</dd>
            </div>
            <div>
              <dt>
                <Mail size={16} strokeWidth={1.8} />
                البريد الإلكتروني
              </dt>
              <dd className="mono" dir="ltr">
                {admin.email ?? "—"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>ملاحظات</h2>
            <StickyNote size={18} strokeWidth={1.8} color="var(--accent-strong)" />
          </div>

          {admin.notes ? (
            <p className="notes-text">{admin.notes}</p>
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
              <dd>{formatDate(admin.createdAt)}</dd>
            </div>
            <div>
              <dt>آخر تحديث</dt>
              <dd>{formatDate(admin.updatedAt)}</dd>
            </div>
            <div>
              <dt>المعرف</dt>
              <dd className="mono">{admin.id}</dd>
            </div>
          </dl>
        </article>
      </section>
    </>
  );
}
