import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import { NewStudentForm } from "./NewStudentForm";

export default async function NewStudentPage() {
  await requirePermission("students.write");
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">إضافة سجل</p>
          <h2 className="page-title">تسجيل طالبة جديدة</h2>
          <p className="page-subtitle">
            عبئي البيانات الأساسية للطالبة. الحقول المعلّمة بنجمة مطلوبة، ويمكن إكمال
            البيانات الإضافية لاحقا من ملف الطالبة.
          </p>
        </div>

        <Link className="ghost-link" href="/students">
          <ArrowRight size={16} strokeWidth={2} />
          الرجوع للقائمة
        </Link>
      </header>

      <section className="card form-card">
        <NewStudentForm />
      </section>
    </>
  );
}
