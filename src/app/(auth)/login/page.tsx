import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { ensureCsrfToken } from "@/lib/csrf";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

type Search = Promise<{ next?: string; reason?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const params = await searchParams;
  const session = await getCurrentSession();
  if (session) {
    redirect(params.next || "/");
  }
  const csrfToken = await ensureCsrfToken();

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
        <h2 className="login-title">تسجيل الدخول</h2>
        <p className="login-subtitle">
          أهلاً بعودتك، سجّلي الدخول للوصول إلى لوحة الإدارة.
        </p>
        {params.reason === "expired" ? (
          <div className="form-error">
            انتهت صلاحية الجلسة، يرجى تسجيل الدخول من جديد.
          </div>
        ) : null}
        <LoginForm next={params.next} csrfToken={csrfToken} />
        <div className="login-hint">
          <strong>للتجربة:</strong>
          <br />
          اسم المستخدم: <code>admin</code> — كلمة المرور: <code>admin1234</code>
        </div>

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link className="ghost-link" href="/inquiry">
            <Search size={16} strokeWidth={2} />
            استعلام طالبة برقم الهوية (بدون تسجيل دخول)
          </Link>
        </div>
      </div>
    </div>
  );
}
