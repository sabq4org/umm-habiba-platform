"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { PASSWORD_HINT, PASSWORD_POLICY } from "@/lib/passwordPolicy";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "./actions";

const initialState: ChangePasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary-button" disabled={pending}>
      {pending ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
    </button>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialState);

  return (
    <form action={action} className="login-form">
      <label className="form-row">
        <span>كلمة المرور الحالية</span>
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
        />
      </label>
      <label className="form-row">
        <span>كلمة المرور الجديدة</span>
        <input
          name="newPassword"
          type="password"
          required
          minLength={PASSWORD_POLICY.minLength}
          maxLength={PASSWORD_POLICY.maxLength}
          autoComplete="new-password"
          dir="ltr"
          title={PASSWORD_HINT}
        />
        <small className="muted-text">{PASSWORD_HINT}</small>
      </label>
      <label className="form-row">
        <span>تأكيد كلمة المرور</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={PASSWORD_POLICY.minLength}
          maxLength={PASSWORD_POLICY.maxLength}
          autoComplete="new-password"
          dir="ltr"
        />
      </label>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      <SubmitButton />
    </form>
  );
}
