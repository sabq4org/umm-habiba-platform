import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import { NewAdminForm } from "./NewAdminForm";

export default async function NewAdminPage() {
  await requirePermission("admins.write");
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">إضافة سجل</p>
          <h2 className="page-title">تسجيل إدارية جديدة</h2>
          <p className="page-subtitle">
            عبئي البيانات الأساسية للإدارية. الحقول المعلّمة بنجمة مطلوبة.
          </p>
        </div>

        <Link className="ghost-link" href="/admins">
          <ArrowRight size={16} strokeWidth={2} />
          الرجوع للقائمة
        </Link>
      </header>

      <section className="card form-card">
        <NewAdminForm />
      </section>
    </>
  );
}
