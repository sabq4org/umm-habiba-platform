"use client";

import { useActionState } from "react";
import { createSubjectAction, type SubjectFormState } from "../actions";
import {
  SubjectFormFields,
  type TeacherOption,
} from "../SubjectFormFields";

const initialState: SubjectFormState = {};

export function NewSubjectForm({ teachers }: { teachers: TeacherOption[] }) {
  const [state, formAction] = useActionState(createSubjectAction, initialState);
  return (
    <form action={formAction} className="form-grid" noValidate>
      <SubjectFormFields
        state={state}
        submitLabel="حفظ المادة"
        teachers={teachers}
      />
    </form>
  );
}
