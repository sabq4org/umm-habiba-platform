import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ForbiddenPage() {
  return (
    <section className="card forbidden-card">
      <div className="forbidden-icon">
        <ShieldAlert size={48} strokeWidth={1.6} />
      </div>
      <h2 className="page-title">لا تملكين صلاحية الوصول</h2>
      <p className="page-subtitle">
        هذه الصفحة أو الإجراء يتطلب صلاحية أعلى. لو تعتقدين أن هذا خطأ تواصلي مع
        مديرة المنصة لمراجعة دورك.
      </p>
      <div className="row-actions">
        <Link href="/" className="button">
          العودة للوحة التحكم
        </Link>
      </div>
    </section>
  );
}
