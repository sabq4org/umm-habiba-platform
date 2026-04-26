import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ROLES, roleLabel } from "@/lib/roles";
import { requirePermission } from "@/lib/permissions";
import { PASSWORD_HINT, PASSWORD_POLICY } from "@/lib/passwordPolicy";
import { NewUserForm } from "./NewUserForm";
import {
  resetPasswordAction,
  setUserStatusAction,
  unlockUserAction,
} from "./actions";

export const dynamic = "force-dynamic";

type Search = Promise<{
  created?: string;
  reset?: string;
  resetError?: string;
  resetTarget?: string;
}>;

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  await requirePermission("users.read");
  const params = await searchParams;
  const list = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      fullName: schema.users.fullName,
      role: schema.users.role,
      status: schema.users.status,
      lastLoginAt: schema.users.lastLoginAt,
      teacherId: schema.users.teacherId,
      studentId: schema.users.studentId,
      mustChangePassword: schema.users.mustChangePassword,
      lockedUntil: schema.users.lockedUntil,
      failedLoginAttempts: schema.users.failedLoginAttempts,
      teacherName: schema.teachers.fullName,
      studentName: schema.students.fullName,
    })
    .from(schema.users)
    .leftJoin(schema.teachers, eq(schema.teachers.id, schema.users.teacherId))
    .leftJoin(schema.students, eq(schema.students.id, schema.users.studentId))
    .orderBy(asc(schema.users.username));

  // eslint-disable-next-line react-hooks/purity -- server component, fresh render per request
  const now = Date.now();

  const studentList = await db
    .select({
      id: schema.students.id,
      fullName: schema.students.fullName,
      grade: schema.students.grade,
      section: schema.students.section,
    })
    .from(schema.students)
    .orderBy(asc(schema.students.fullName));

  const teacherList = await db
    .select({
      id: schema.teachers.id,
      fullName: schema.teachers.fullName,
      specialty: schema.teachers.specialty,
    })
    .from(schema.teachers)
    .orderBy(asc(schema.teachers.fullName));

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">النظام / الإعدادات</span>
          <h1>إدارة المستخدمات</h1>
          <p>إنشاء حسابات جديدة، تعديل الأدوار، وإعادة تعيين كلمات المرور.</p>
        </div>
      </header>

      {params.created ? (
        <div className="notice ok">
          تم إنشاء الحساب بنجاح. سيُطلب من المستخدمة تغيير كلمة المرور عند أول دخول.
        </div>
      ) : null}
      {params.reset ? (
        <div className="notice ok">
          تم تحديث كلمة المرور. سيُطلب من المستخدمة تغييرها عند أول دخول.
        </div>
      ) : null}
      {params.resetError ? (
        <div className="notice danger">{params.resetError}</div>
      ) : null}

      <section className="two-col">
        <div className="card">
          <div className="card-head">
            <h3>الحسابات الحالية</h3>
            <span className="muted-text">عدد: {list.length}</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>اسم المستخدم</th>
                  <th>الاسم الكامل</th>
                  <th>الدور</th>
                  <th>الحالة</th>
                  <th>آخر دخول</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => {
                  const isLocked =
                    u.lockedUntil &&
                    (u.lockedUntil as Date).getTime() > now;
                  return (
                    <tr key={u.id}>
                      <td dir="ltr">
                        <code>{u.username}</code>
                      </td>
                      <td>
                        {u.fullName}
                        {u.studentName ? (
                          <div className="small status-muted">
                            مرتبطة بالطالبة: {u.studentName}
                          </div>
                        ) : null}
                        {u.teacherName ? (
                          <div className="small status-muted">
                            مرتبطة بسجل المعلمة: {u.teacherName}
                          </div>
                        ) : null}
                        {u.mustChangePassword ? (
                          <div className="small status-muted">
                            ينتظر تغيير كلمة المرور عند أول دخول
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <span className="status-chip status-muted">
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td>
                        {isLocked ? (
                          <span className="status-chip status-danger">
                            مقفل مؤقتاً
                          </span>
                        ) : (
                          <span
                            className={`status-chip ${
                              u.status === "active"
                                ? "status-ok"
                                : "status-danger"
                            }`}
                          >
                            {u.status === "active" ? "نشط" : "موقوف"}
                          </span>
                        )}
                        {u.failedLoginAttempts > 0 && !isLocked ? (
                          <div className="small status-muted">
                            محاولات فاشلة: {u.failedLoginAttempts}
                          </div>
                        ) : null}
                      </td>
                      <td>{formatDate(u.lastLoginAt as Date | null)}</td>
                      <td>
                        <div className="row-actions">
                          <form
                            action={setUserStatusAction.bind(
                              null,
                              u.id,
                              u.status === "active" ? "disabled" : "active",
                            )}
                          >
                            <button type="submit" className="ghost-button">
                              {u.status === "active" ? "إيقاف" : "تفعيل"}
                            </button>
                          </form>
                          {isLocked || u.failedLoginAttempts > 0 ? (
                            <form action={unlockUserAction.bind(null, u.id)}>
                              <button type="submit" className="ghost-button">
                                فك القفل
                              </button>
                            </form>
                          ) : null}
                          <form action={resetPasswordAction.bind(null, u.id)}>
                            <input
                              type="password"
                              name="password"
                              placeholder="كلمة مرور جديدة"
                              minLength={PASSWORD_POLICY.minLength}
                              title={PASSWORD_HINT}
                              className="inline-input"
                            />
                            <button type="submit" className="ghost-button">
                              تحديث
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>إنشاء حساب جديد</h3>
          </div>
          <NewUserForm
            roles={ROLES.map((r) => ({ value: r.value, label: r.label }))}
            students={studentList.map((s) => ({
              id: s.id,
              label: `${s.fullName} (${s.grade} — ${s.section})`,
            }))}
            teachers={teacherList.map((t) => ({
              id: t.id,
              label: `${t.fullName} (${t.specialty})`,
            }))}
          />
        </div>
      </section>
    </>
  );
}
