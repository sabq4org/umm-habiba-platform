"use client";

import { useActionState } from "react";
import { updateTeacherAction, type TeacherFormState } from "../../actions";
import { TeacherFormFields } from "../../TeacherFormFields";

export function EditTeacherForm({
  id,
  values,
}: {
  id: string;
  values: Record<string, string>;
}) {
  const initialState: TeacherFormState = { values };
  const action = updateTeacherAction.bind(null, id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-grid" noValidate>
      <TeacherFormFields state={state} submitLabel="حفظ التعديلات" showStatus />
    </form>
  );
}
