"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signInAction, type LoginFormState } from "../actions";

const initialState: LoginFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary-button" disabled={pending}>
      {pending ? "جاري التحقق..." : "تسجيل الدخول"}
    </button>
  );
}

export function LoginForm({
  next,
  csrfToken,
}: {
  next?: string;
  csrfToken: string;
}) {
  const [state, action] = useActionState(signInAction, initialState);

  return (
    <form action={action} className="login-form">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label className="form-row">
        <span>اسم المستخدم</span>
        <input
          name="username"
          type="text"
          required
          autoComplete="username"
          defaultValue={state.username ?? ""}
          dir="ltr"
        />
      </label>
      <label className="form-row">
        <span>كلمة المرور</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
        />
      </label>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      <SubmitButton />
    </form>
  );
}
