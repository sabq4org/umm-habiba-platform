import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { EditTeacherForm } from "./EditTeacherForm";
import { DeleteTeacherButton } from "./DeleteTeacherButton";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditTeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("teachers.write");
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

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">تعديل سجل</p>
          <h2 className="page-title">تعديل بيانات المعلمة</h2>
          <p className="page-subtitle">
            عدّلي البيانات حسب الحاجة. التغييرات تُحفظ مباشرة في قاعدة البيانات.
          </p>
        </div>

        <Link className="ghost-link" href={`/teachers/${teacher.id}`}>
          <ArrowRight size={16} strokeWidth={2} />
          الرجوع للملف
        </Link>
      </header>

      <section className="card form-card">
        <EditTeacherForm
          id={teacher.id}
          values={{
            fullName: teacher.fullName,
            nationalId: teacher.nationalId,
            specialty: teacher.specialty,
            subjects: teacher.subjects ?? "",
            qualification: teacher.qualification ?? "",
            yearsOfService: String(teacher.yearsOfService),
            weeklyLoad: String(teacher.weeklyLoad),
            phone: teacher.phone ?? "",
            email: teacher.email ?? "",
            status: teacher.status,
            notes: teacher.notes ?? "",
          }}
        />
      </section>

      <section className="card danger-zone">
        <div className="section-heading">
          <h2>منطقة الإجراءات الحساسة</h2>
        </div>
        <div className="danger-row">
          <div>
            <h3>حذف ملف المعلمة</h3>
            <p>
              سيتم حذف بيانات المعلمة بشكل نهائي من القاعدة. هذا الإجراء لا يمكن التراجع
              عنه.
            </p>
          </div>
          <DeleteTeacherButton id={teacher.id} name={teacher.fullName} />
        </div>
      </section>
    </>
  );
}
