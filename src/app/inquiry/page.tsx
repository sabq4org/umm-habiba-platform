import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getInquiryStudentId } from "@/lib/inquiry";
import { InquiryForm } from "./InquiryForm";

export const dynamic = "force-dynamic";

export default async function InquiryPage() {
  const existing = await getInquiryStudentId();
  if (existing) {
    redirect("/inquiry/profile");
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">أ.ح</div>
          <div>
            <h1>منصة أم حبيبة التعليمية</h1>
            <p>متوسطة أم حبيبة التعليمية - صبيا</p>
          </div>
        </div>

        <h2 className="login-title">استعلام الطالبة عن بياناتها</h2>
        <p className="login-subtitle">
          أدخلي رقم الهوية الوطنية وتاريخ ميلادك لعرض ملفك الكامل: البيانات
          الشخصية، الدرجات حسب الفترات، والحضور.
        </p>

        <InquiryForm />

        <div className="login-hint">
          <ShieldCheck size={16} strokeWidth={2} style={{ marginInlineEnd: 6 }} />
          <strong>خصوصية:</strong>
          <br />
          البيانات تظهر فقط بعد التحقق من رقم الهوية + تاريخ الميلاد. تحديث
          البيانات أو الاستفسار عن مشكلة يتم عبر إدارة المدرسة.
        </div>

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link className="ghost-link" href="/login">
            <ArrowLeft size={16} strokeWidth={2} />
            تسجيل دخول للإدارة بدلاً من ذلك
          </Link>
        </div>
      </div>
    </div>
  );
}
