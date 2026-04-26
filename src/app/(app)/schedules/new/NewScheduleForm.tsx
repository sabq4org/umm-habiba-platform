"use client";

import { useActionState } from "react";
import { createScheduleAction, type ScheduleFormState } from "../actions";
import {
  ScheduleFormFields,
  type ClassOption,
  type SubjectOption,
  type TeacherOption,
} from "../ScheduleFormFields";

export function NewScheduleForm({
  classes,
  subjects,
  teachers,
  presetClassId,
}: {
  classes: ClassOption[];
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  presetClassId?: string;
}) {
  const initialState: ScheduleFormState = presetClassId
    ? { values: { classId: presetClassId } }
    : {};
  const [state, formAction] = useActionState(createScheduleAction, initialState);

  return (
    <form action={formAction} className="form-grid" noValidate>
      <ScheduleFormFields
        state={state}
        submitLabel="حفظ الحصة"
        classes={classes}
        subjects={subjects}
        teachers={teachers}
      />
    </form>
  );
}
