"use client";

import { useActionState } from "react";
import { updateClassAction, type ClassFormState } from "../../actions";
import { ClassFormFields, type TeacherOption } from "../../ClassFormFields";

export function EditClassForm({
  id,
  values,
  teachers,
}: {
  id: string;
  values: Record<string, string>;
  teachers: TeacherOption[];
}) {
  const initialState: ClassFormState = { values };
  const action = updateClassAction.bind(null, id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-grid" noValidate>
      <ClassFormFields
        state={state}
        submitLabel="حفظ التعديلات"
        showStatus
        teachers={teachers}
      />
    </form>
  );
}
