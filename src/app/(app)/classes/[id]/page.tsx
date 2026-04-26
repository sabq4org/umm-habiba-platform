import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  IdCard,
  Pencil,
  StickyNote,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const statusLabels: Record<string, string> = {
  active: "نشط",
  archived: "مؤرشف",
};

const studentStatusLabels: Record<string, string> = {
  active: "نشطة",
  transferred: "منقولة",
  graduated: "متخرجة",
  suspended: "موقوفة",
};

function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default async function ClassProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("classes.read");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [classRow] = await db
    .select({
      id: schema.classes.id,
      grade: schema.classes.grade,
      section: schema.classes.section,
      academicYear: schema.classes.academicYear,
      capacity: schema.classes.capacity,
      room: schema.classes.room,
      status: schema.classes.status,
      notes: schema.classes.notes,
      createdAt: schema.classes.createdAt,
      updatedAt: schema.classes.updatedAt,
      homeroomTeacherId: schema.classes.homeroomTeacherId,
      teacherName: schema.teachers.fullName,
      teacherSpecialty: schema.teachers.specialty,
    })
    .from(schema.classes)
    .leftJoin(
      schema.teachers,
      eq(schema.classes.homeroomTeacherId, schema.teachers.id),
    )
    .where(eq(schema.classes.id, id))
    .limit(1);

  if (!classRow) notFound();

  const studentsList = await db
    .select()
    .from(schema.students)
    .where(
      and(
        eq(schema.students.grade, classRow.grade),
        eq(schema.students.section, classRow.section),
      ),
    )
    .orderBy(asc(schema.students.fullName));

  const enrolled = studentsList.length;
  const fillPct = classRow.capacity
    ? Math.round((enrolled / classRow.capacity) * 100)
    : 0;
  const statusLabel = statusLabels[classRow.status] ?? classRow.status;
  const statusTone = classRow.status === "active" ? "good" : "warn";

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <BookOpen size={14} strokeWidth={2} />
            ملف الفصل
          </p>
          <h2 className="page-title">
            {classRow.grade} — {classRow.section}
          </h2>
          <p className="page-subtitle">
            عرض كامل للفصل: العام الدراسي، الغرفة، السعة، رائدة الفصل، وقائمة الطالبات
            المسجلات في هذه الشعبة.
          </p>
        </div>

        <div className="top-actions">
          <Link className="ghost-link" href="/classes">
            <ArrowRight size={16} strokeWidth={2} />
            الرجوع للقائمة
          </Link>
          <Link
            className="ghost-link"
            href={`/schedules/class/${classRow.id}`}
          >
            <CalendarDays size={16} strokeWidth={2} />
            جدول الفصل
          </Link>
          <Link
            className="ghost-link"
            href={`/attendance/class/${classRow.id}`}
          >
            <ClipboardList size={16} strokeWidth={2} />
            تسجيل الحضور
          </Link>
          <Link
            className="ghost-link"
            href={`/grades/class/${classRow.id}`}
          >
            <ClipboardCheck size={16} strokeWidth={2} />
            درجات الفصل
          </Link>
          <Link className="button" href={`/classes/${classRow.id}/edit`}>
            <Pencil size={18} strokeWidth={2} />
            تعديل البيانات
          </Link>
        </div>
      </header>

      <section className="card profile-hero">
        <div className="profile-avatar">{classRow.section}</div>
        <div className="profile-hero-body">
          <div className="profile-hero-row">
            <h3>
              {classRow.grade} — {classRow.section}
            </h3>
            <span className={`status ${statusTone}`}>{statusLabel}</span>
          </div>
          <div className="profile-meta">
            <span>
              <CalendarDays size={16} strokeWidth={1.8} />
              {classRow.academicYear}
            </span>
            <span>
              <DoorOpen size={16} strokeWidth={1.8} />
              <span className="mono">{classRow.room ?? "غير محددة"}</span>
            </span>
            <span>
              <Users size={16} strokeWidth={1.8} />
              {enrolled} / {classRow.capacity} ({fillPct}%)
            </span>
          </div>
        </div>
      </section>

      <section className="grid profile-grid">
        <article className="card">
          <div className="section-heading">
            <h2>بيانات الفصل</h2>
            <span className="pill">أساسي</span>
          </div>

          <dl className="info-list">
            <div>
              <dt>
                <GraduationCap size={16} strokeWidth={1.8} />
                الصف
              </dt>
              <dd>{classRow.grade}</dd>
            </div>
            <div>
              <dt>
                <IdCard size={16} strokeWidth={1.8} />
                رمز الشعبة
              </dt>
              <dd className="mono">{classRow.section}</dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={16} strokeWidth={1.8} />
                العام الدراسي
              </dt>
              <dd>{classRow.academicYear}</dd>
            </div>
            <div>
              <dt>
                <DoorOpen size={16} strokeWidth={1.8} />
                الغرفة
              </dt>
              <dd className="mono">{classRow.room ?? "—"}</dd>
            </div>
            <div>
              <dt>
                <Users size={16} strokeWidth={1.8} />
                السعة
              </dt>
              <dd>{classRow.capacity}</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>رائدة الفصل</h2>
            <UserRound size={18} strokeWidth={1.8} color="var(--accent-strong)" />
          </div>

          {classRow.homeroomTeacherId && classRow.teacherName ? (
            <dl className="info-list">
              <div>
                <dt>
                  <UserRound size={16} strokeWidth={1.8} />
                  الاسم
                </dt>
                <dd>
                  <Link
                    className="row-link"
                    href={`/teachers/${classRow.homeroomTeacherId}`}
                  >
                    {classRow.teacherName}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>التخصص</dt>
                <dd>{classRow.teacherSpecialty ?? "—"}</dd>
              </div>
            </dl>
          ) : (
            <div className="empty-state">
              <h3>لم يتم تعيين رائدة فصل</h3>
              <p>يمكن تعيين رائدة الفصل من زر تعديل البيانات.</p>
            </div>
          )}
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>ملاحظات</h2>
            <StickyNote size={18} strokeWidth={1.8} color="var(--accent-strong)" />
          </div>
          {classRow.notes ? (
            <p className="notes-text">{classRow.notes}</p>
          ) : (
            <div className="empty-state">
              <h3>لا توجد ملاحظات</h3>
              <p>أضيفي ملاحظات تخص هذا الفصل من زر التعديل.</p>
            </div>
          )}
        </article>

        <article className="card field-full">
          <div className="section-heading">
            <h2>قائمة الطالبات ({enrolled})</h2>
            <span className="pill tone-mint">حسب الصف والشعبة</span>
          </div>

          {studentsList.length === 0 ? (
            <div className="empty-state">
              <h3>لا يوجد طالبات في هذه الشعبة</h3>
              <p>
                لم يتم تسجيل أي طالبة بهذا الصف ({classRow.grade}) والشعبة (
                {classRow.section}) بعد.
              </p>
              <Link className="button" href="/students/new">
                إضافة طالبة
              </Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>رقم الهوية</th>
                    <th>ولي الأمر</th>
                    <th>جوال ولي الأمر</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsList.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <Link
                          className="row-link"
                          href={`/students/${student.id}`}
                        >
                          {student.fullName}
                        </Link>
                      </td>
                      <td className="mono">{student.nationalId}</td>
                      <td>{student.guardianName ?? "—"}</td>
                      <td className="mono">{student.guardianPhone ?? "—"}</td>
                      <td>
                        <span
                          className={`status ${
                            student.status === "active" ? "good" : "warn"
                          }`}
                        >
                          {studentStatusLabels[student.status] ?? student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <dd>{formatDate(classRow.createdAt)}</dd>
            </div>
            <div>
              <dt>آخر تحديث</dt>
              <dd>{formatDate(classRow.updatedAt)}</dd>
            </div>
            <div>
              <dt>المعرف</dt>
              <dd className="mono">{classRow.id}</dd>
            </div>
          </dl>
        </article>
      </section>
    </>
  );
}
