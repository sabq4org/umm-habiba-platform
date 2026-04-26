import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { EditStudentForm } from "./EditStudentForm";
import { DeleteStudentButton } from "./DeleteStudentButton";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("students.write");
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    notFound();
  }

  const [student] = await db
    .select()
    .from(schema.students)
    .where(eq(schema.students.id, id))
    .limit(1);

  if (!student) {
    notFound();
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">تعديل سجل</p>
          <h2 className="page-title">تعديل بيانات الطالبة</h2>
          <p className="page-subtitle">
            عدّلي البيانات حسب الحاجة. التغييرات تُحفظ مباشرة في قاعدة البيانات. الحقول
            المعلّمة بنجمة مطلوبة.
          </p>
        </div>

        <Link className="ghost-link" href={`/students/${student.id}`}>
          <ArrowRight size={16} strokeWidth={2} />
          الرجوع للملف
        </Link>
      </header>

      <section className="card form-card">
        <EditStudentForm
          id={student.id}
          values={{
            fullName: student.fullName,
            nationalId: student.nationalId,
            grade: student.grade,
            section: student.section,
            phone: student.phone ?? "",
            guardianName: student.guardianName ?? "",
            guardianPhone: student.guardianPhone ?? "",
            status: student.status,
            notes: student.notes ?? "",
            dateOfBirth: student.dateOfBirth ?? "",
            nationality: student.nationality ?? "",
            bloodType: student.bloodType ?? "",
            email: student.email ?? "",
            address: student.address ?? "",
            chronicDiseases: student.chronicDiseases ?? "",
            allergies: student.allergies ?? "",
            emergencyContactName: student.emergencyContactName ?? "",
            emergencyContactPhone: student.emergencyContactPhone ?? "",
            enrollmentDate: student.enrollmentDate ?? "",
            previousSchool: student.previousSchool ?? "",
          }}
        />
      </section>

      <section className="card danger-zone">
        <div className="section-heading">
          <h2>منطقة الإجراءات الحساسة</h2>
        </div>
        <div className="danger-row">
          <div>
            <h3>حذف ملف الطالبة</h3>
            <p>
              سيتم حذف بيانات الطالبة بشكل نهائي من القاعدة. هذا الإجراء لا يمكن التراجع
              عنه.
            </p>
          </div>
          <DeleteStudentButton id={student.id} name={student.fullName} />
        </div>
      </section>
    </>
  );
}
