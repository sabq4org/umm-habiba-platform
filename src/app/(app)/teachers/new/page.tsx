import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import { NewTeacherForm } from "./NewTeacherForm";

export default async function NewTeacherPage() {
  await requirePermission("teachers.write");
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">إضافة سجل</p>
          <h2 className="page-title">تسجيل معلمة جديدة</h2>
          <p className="page-subtitle">
            عبئي البيانات الأساسية للمعلمة. الحقول المعلّمة بنجمة مطلوبة.
          </p>
        </div>

        <Link className="ghost-link" href="/teachers">
          <ArrowRight size={16} strokeWidth={2} />
          الرجوع للقائمة
        </Link>
      </header>

      <section className="card form-card">
        <NewTeacherForm />
      </section>
    </>
  );
}
