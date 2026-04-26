import { Check, Minus, X } from "lucide-react";
import {
  PERMISSION_MATRIX,
  ROLES,
  permissionLabel,
  permissionTone,
} from "@/lib/roles";

export const dynamic = "force-dynamic";

export default function PermissionsPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">النظام</span>
          <h1>الصلاحيات والأدوار</h1>
          <p>
            نموذج عمل المنصة يعتمد على أربعة أدوار رئيسية، ولكل دور صلاحيات
            محددة على وحدات النظام.
          </p>
        </div>
      </header>

      <section className="stats-grid">
        {ROLES.map((role) => (
          <div className="stat-card" key={role.value}>
            <span className="stat-label">{role.label}</span>
            <strong className="stat-value">
              {role.value === "admin"
                ? "صلاحيات كاملة"
                : role.value === "staff"
                  ? "إدارة وعمليات"
                  : role.value === "teacher"
                    ? "حضور ودرجات"
                    : "متابعة فقط"}
            </strong>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>مصفوفة الصلاحيات</h3>
          <span className="muted-text">
            مرجع رسمي لما يستطيع كل دور القيام به داخل المنصة.
          </span>
        </div>
        <div className="table-wrap">
          <table className="data-table permissions-table">
            <thead>
              <tr>
                <th>الوحدة</th>
                {ROLES.map((r) => (
                  <th key={r.value}>{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.feature}>
                  <td>
                    <strong>{row.feature}</strong>
                    {row.description ? (
                      <div className="muted-text small">{row.description}</div>
                    ) : null}
                  </td>
                  {ROLES.map((r) => {
                    const value = row.byRole[r.value];
                    const tone = permissionTone(value);
                    const label = permissionLabel(value);
                    const Icon =
                      value === "yes" ? Check : value === "no" ? X : Minus;
                    return (
                      <td key={r.value}>
                        <span className={`perm-pill perm-${tone}`}>
                          <Icon size={12} strokeWidth={2.4} />
                          <span>{label}</span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>ملاحظات تشغيلية</h3>
        </div>
        <ul className="bullet-list">
          <li>
            تعتمد المصادقة على جلسات مشفرة (HMAC SHA-256) محفوظة في كوكي آمن مدته
            7 أيام.
          </li>
          <li>كلمة المرور مخزّنة بعد تطبيق scrypt مع ملح عشوائي لكل حساب.</li>
          <li>
            يتم تسجيل عمليات تسجيل الدخول والإجراءات الحساسة في سجل التدقيق.
          </li>
          <li>
            يمكن للمديرة إنشاء حسابات جديدة من صفحة الإعدادات → إدارة المستخدمات.
          </li>
        </ul>
      </section>
    </>
  );
}
