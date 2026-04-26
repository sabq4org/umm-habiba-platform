"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Search } from "lucide-react";
import { lookupStudentAction, type InquiryFormState } from "./actions";

const initialState: InquiryFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary-button" disabled={pending}>
      <Search size={18} strokeWidth={2} />
      {pending ? "جاري التحقق..." : "استعلام"}
    </button>
  );
}

export function InquiryForm() {
  const [state, action] = useActionState(lookupStudentAction, initialState);

  return (
    <form action={action} className="login-form" noValidate>
      <label className="form-row">
        <span>رقم الهوية</span>
        <input
          name="nationalId"
          type="text"
          required
          inputMode="numeric"
          pattern="[0-9]{8,15}"
          autoComplete="off"
          dir="ltr"
          defaultValue={state.values?.nationalId ?? ""}
          placeholder="10 أرقام"
        />
      </label>
      <label className="form-row">
        <span>تاريخ الميلاد</span>
        <input
          name="dateOfBirth"
          type="date"
          required
          dir="ltr"
          defaultValue={state.values?.dateOfBirth ?? ""}
        />
      </label>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      <SubmitButton />
    </form>
  );
}
