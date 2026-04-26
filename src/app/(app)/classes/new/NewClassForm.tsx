"use client";

import { useActionState } from "react";
import { createClassAction, type ClassFormState } from "../actions";
import { ClassFormFields, type TeacherOption } from "../ClassFormFields";

const initialState: ClassFormState = {};

export function NewClassForm({ teachers }: { teachers: TeacherOption[] }) {
  const [state, formAction] = useActionState(createClassAction, initialState);
  return (
    <form action={formAction} className="form-grid" noValidate>
      <ClassFormFields
        state={state}
        submitLabel="حفظ الفصل"
        teachers={teachers}
      />
    </form>
  );
}
