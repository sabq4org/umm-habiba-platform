"use client";

import { useActionState } from "react";
import { updateStudentAction, type StudentFormState } from "../../actions";
import { StudentFormFields } from "../../StudentFormFields";

export function EditStudentForm({
  id,
  values,
}: {
  id: string;
  values: Record<string, string>;
}) {
  const initialState: StudentFormState = { values };
  const action = updateStudentAction.bind(null, id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-grid" noValidate>
      <StudentFormFields state={state} submitLabel="حفظ التعديلات" showStatus />
    </form>
  );
}
