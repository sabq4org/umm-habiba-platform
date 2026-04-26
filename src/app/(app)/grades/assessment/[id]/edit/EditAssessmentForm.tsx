"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import {
  updateAssessmentAction,
  type AssessmentFormState,
} from "../../../actions";
import AssessmentFormFields from "../../../AssessmentFormFields";

type ClassOption = {
  id: string;
  grade: string;
  section: string;
  academicYear: string;
};

type SubjectOption = {
  id: string;
  name: string;
  code: string | null;
  grade: string;
};

type Props = {
  id: string;
  classes: ClassOption[];
  subjects: SubjectOption[];
  initialValues: Record<string, string>;
};

const initial: AssessmentFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button" disabled={pending}>
      <Save size={16} strokeWidth={2} />
      {pending ? "جاري الحفظ…" : "حفظ التعديلات"}
    </button>
  );
}

export default function EditAssessmentForm({
  id,
  classes,
  subjects,
  initialValues,
}: Props) {
  const action = updateAssessmentAction.bind(null, id);
  const [state, formAction] = useActionState(action, initial);
  const values = state?.values ?? initialValues;

  return (
    <form action={formAction}>
      {state?.error && <div className="form-error">{state.error}</div>}
      <AssessmentFormFields
        classes={classes}
        subjects={subjects}
        values={values}
      />
      <div className="form-actions">
        <SubmitButton />
      </div>
    </form>
  );
}
