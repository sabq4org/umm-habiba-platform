"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendMessageAction, type MessageFormState } from "./actions";

const initial: MessageFormState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary-button" disabled={pending}>
      {pending ? "جاري الإرسال..." : "إرسال"}
    </button>
  );
}

type User = { id: string; fullName: string; role: string };
type RoleOption = { value: string; label: string };

export function NewMessageForm({
  users,
  roles,
}: {
  users: User[];
  roles: RoleOption[];
}) {
  const [state, action] = useActionState(sendMessageAction, initial);
  const [mode, setMode] = useState<"user" | "role">(
    state.values?.recipientUserId ? "user" : "role",
  );
  const v = state.values ?? {};

  return (
    <form action={action} className="vstack gap-md">
      <div className="recipient-toggle">
        <button
          type="button"
          className={`chip ${mode === "role" ? "chip-active" : ""}`}
          onClick={() => setMode("role")}
        >
          إلى فئة
        </button>
        <button
          type="button"
          className={`chip ${mode === "user" ? "chip-active" : ""}`}
          onClick={() => setMode("user")}
        >
          إلى مستلمة محددة
        </button>
      </div>

      {mode === "role" ? (
        <label className="form-row">
          <span>الفئة</span>
          <select
            name="recipientRole"
            defaultValue={v.recipientRole ?? roles[0]?.value ?? "admin"}
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <input type="hidden" name="recipientUserId" value="" />
        </label>
      ) : (
        <label className="form-row">
          <span>المستلمة</span>
          <select
            name="recipientUserId"
            defaultValue={v.recipientUserId ?? ""}
            required
          >
            <option value="">— اختاري —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
          <input type="hidden" name="recipientRole" value="" />
        </label>
      )}

      <label className="form-row">
        <span>الموضوع</span>
        <input
          name="subject"
          type="text"
          required
          maxLength={200}
          defaultValue={v.subject ?? ""}
        />
      </label>
      <label className="form-row">
        <span>الرسالة</span>
        <textarea
          name="body"
          rows={5}
          required
          defaultValue={v.body ?? ""}
        />
      </label>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      <Submit />
    </form>
  );
}
