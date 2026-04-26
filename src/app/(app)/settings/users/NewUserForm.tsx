"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { PASSWORD_HINT, PASSWORD_POLICY } from "@/lib/passwordPolicy";
import { createUserAction, type UserFormState } from "./actions";

const initial: UserFormState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary-button" disabled={pending}>
      {pending ? "جاري الإنشاء..." : "إنشاء الحساب"}
    </button>
  );
}

type Linkable = { id: string; label: string };

export function NewUserForm({
  roles,
  students,
  teachers,
}: {
  roles: Array<{ value: string; label: string }>;
  students: Linkable[];
  teachers: Linkable[];
}) {
  const [state, action] = useActionState(createUserAction, initial);
  const v = state.values ?? {};
  const [role, setRole] = useState<string>(v.role ?? "staff");

  return (
    <form action={action} className="vstack gap-md">
      <label className="form-row">
        <span>اسم المستخدم</span>
        <input
          name="username"
          type="text"
          dir="ltr"
          required
          minLength={3}
          maxLength={40}
          defaultValue={v.username ?? ""}
        />
      </label>
      <label className="form-row">
        <span>الاسم الكامل</span>
        <input
          name="fullName"
          type="text"
          required
          maxLength={160}
          defaultValue={v.fullName ?? ""}
        />
      </label>
      <label className="form-row">
        <span>الدور</span>
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      {role === "guardian" ? (
        <label className="form-row">
          <span>الطالبة المرتبطة (إلزامي)</span>
          <select
            name="linkedStudentId"
            defaultValue={v.linkedStudentId ?? ""}
            required
          >
            <option value="">— اختاري الطالبة —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {role === "teacher" ? (
        <label className="form-row">
          <span>سجل المعلمة المرتبط (إلزامي)</span>
          <select
            name="linkedTeacherId"
            defaultValue={v.linkedTeacherId ?? ""}
            required
          >
            <option value="">— اختاري المعلمة —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="form-row">
        <span>كلمة المرور المؤقتة</span>
        <input
          name="password"
          type="password"
          required
          minLength={PASSWORD_POLICY.minLength}
          maxLength={PASSWORD_POLICY.maxLength}
          dir="ltr"
          placeholder={PASSWORD_HINT}
          title={PASSWORD_HINT}
        />
        <small className="muted-text">{PASSWORD_HINT}</small>
        <small className="muted-text">
          سيُطلب من المستخدمة تغييرها عند أول دخول.
        </small>
      </label>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      <Submit />
    </form>
  );
}
