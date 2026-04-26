"use client";

import { useActionState } from "react";
import { updateScheduleAction, type ScheduleFormState } from "../../actions";
import {
  ScheduleFormFields,
  type ClassOption,
  type SubjectOption,
  type TeacherOption,
} from "../../ScheduleFormFields";

export function EditScheduleForm({
  id,
  values,
  classes,
  subjects,
  teachers,
}: {
  id: string;
  values: Record<string, string>;
  classes: ClassOption[];
  subjects: SubjectOption[];
  teachers: TeacherOption[];
}) {
  const initialState: ScheduleFormState = { values };
  const action = updateScheduleAction.bind(null, id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-grid" noValidate>
      <ScheduleFormFields
        state={state}
        submitLabel="حفظ التعديلات"
        classes={classes}
        subjects={subjects}
        teachers={teachers}
      />
    </form>
  );
}
