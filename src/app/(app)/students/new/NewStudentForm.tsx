"use client";

import { useActionState } from "react";
import { createStudentAction, type StudentFormState } from "../actions";
import { StudentFormFields } from "../StudentFormFields";

const initialState: StudentFormState = {};

export function NewStudentForm() {
  const [state, formAction] = useActionState(createStudentAction, initialState);
  return (
    <form action={formAction} className="form-grid" noValidate>
      <StudentFormFields state={state} submitLabel="حفظ الطالبة" />
    </form>
  );
}
