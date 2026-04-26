"use client";

import { useActionState } from "react";
import { updateSubjectAction, type SubjectFormState } from "../../actions";
import {
  SubjectFormFields,
  type TeacherOption,
} from "../../SubjectFormFields";

export function EditSubjectForm({
  id,
  values,
  teachers,
}: {
  id: string;
  values: Record<string, string>;
  teachers: TeacherOption[];
}) {
  const initialState: SubjectFormState = { values };
  const action = updateSubjectAction.bind(null, id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-grid" noValidate>
      <SubjectFormFields
        state={state}
        submitLabel="حفظ التعديلات"
        showStatus
        teachers={teachers}
      />
    </form>
  );
}
