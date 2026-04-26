import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { EditSubjectForm } from "./EditSubjectForm";
import { DeleteSubjectButton } from "./DeleteSubjectButton";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditSubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("subjects.write");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [subject] = await db
    .select()
    .from(schema.subjects)
    .where(eq(schema.subjects.id, id))
    .limit(1);

  if (!subject) notFound();

  const teachers = await db
    .select({
      id: schema.teachers.id,
      fullName: schema.teachers.fullName,
      specialty: schema.teachers.specialty,
    })
    .from(schema.teachers)
    .orderBy(asc(schema.teachers.fullName));

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">تعديل سجل</p>
          <h2 className="page-title">تعديل بيانات المادة</h2>
          <p className="page-subtitle">
            عدّلي بيانات المادة حسب الحاجة. التغييرات تُحفظ مباشرة في قاعدة البيانات.
          </p>
        </div>

        <Link className="ghost-link" href={`/subjects/${subject.id}`}>
          <ArrowRight size={16} strokeWidth={2} />
          الرجوع للملف
        </Link>
      </header>

      <section className="card form-card">
        <EditSubjectForm
          id={subject.id}
          teachers={teachers}
          values={{
            name: subject.name,
            code: subject.code ?? "",
            grade: subject.grade,
            weeklyPeriods: String(subject.weeklyPeriods),
            teacherId: subject.teacherId ?? "",
            description: subject.description ?? "",
            status: subject.status,
            notes: subject.notes ?? "",
          }}
        />
      </section>

      <section className="card danger-zone">
        <div className="section-heading">
          <h2>منطقة الإجراءات الحساسة</h2>
        </div>
        <div className="danger-row">
          <div>
            <h3>حذف المادة</h3>
            <p>
              سيتم حذف بيانات المادة بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
            </p>
          </div>
          <DeleteSubjectButton id={subject.id} name={subject.name} />
        </div>
      </section>
    </>
  );
}
