"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createAnnouncementAction,
  type AnnouncementFormState,
} from "./actions";
import { AUDIENCES } from "./constants";

const initial: AnnouncementFormState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary-button" disabled={pending}>
      {pending ? "جاري النشر..." : "نشر الإعلان"}
    </button>
  );
}

export function NewAnnouncementForm() {
  const [state, action] = useActionState(createAnnouncementAction, initial);
  const v = state.values ?? {};

  return (
    <form action={action} className="vstack gap-md">
      <label className="form-row">
        <span>العنوان</span>
        <input
          name="title"
          type="text"
          required
          maxLength={180}
          defaultValue={v.title ?? ""}
        />
      </label>
      <label className="form-row">
        <span>النص</span>
        <textarea
          name="body"
          rows={4}
          required
          defaultValue={v.body ?? ""}
        />
      </label>
      <label className="form-row">
        <span>الجمهور</span>
        <select name="audience" defaultValue={v.audience ?? "all"}>
          {AUDIENCES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <label className="form-row">
        <span>تاريخ الانتهاء (اختياري)</span>
        <input
          name="expiresAt"
          type="datetime-local"
          defaultValue={v.expiresAt ?? ""}
        />
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          name="pinned"
          defaultChecked={v.pinned === "on"}
        />
        <span>تثبيت في أعلى القائمة</span>
      </label>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      <Submit />
    </form>
  );
}
