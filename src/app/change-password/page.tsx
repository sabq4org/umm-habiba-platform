import { redirect } from "next/navigation";
import { signOutAction } from "@/app/(auth)/actions";
import { getCurrentSession } from "@/lib/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

type Search = Promise<{ required?: string }>;

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const params = await searchParams;
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
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
        <h2 className="login-title">تحديث كلمة المرور</h2>
        <p className="login-subtitle">
          {params.required || session.mustChangePassword
            ? "يجب تغيير كلمة المرور قبل المتابعة لاستخدام المنصة."
            : "يمكنك تغيير كلمة المرور الخاصة بك في أي وقت."}
        </p>
        <ChangePasswordForm />
        <form action={signOutAction} style={{ marginTop: "0.75rem" }}>
          <button type="submit" className="ghost-button">
            تسجيل الخروج
          </button>
        </form>
      </div>
    </div>
  );
}
