"use client";

import { useActionState } from "react";
import { createTeacherAction, type TeacherFormState } from "../actions";
import { TeacherFormFields } from "../TeacherFormFields";

const initialState: TeacherFormState = {};

export function NewTeacherForm() {
  const [state, formAction] = useActionState(createTeacherAction, initialState);
  return (
    <form action={formAction} className="form-grid" noValidate>
      <TeacherFormFields state={state} submitLabel="حفظ المعلمة" />
    </form>
  );
}
