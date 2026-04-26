"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import {
  createAssessmentAction,
  type AssessmentFormState,
} from "../../actions";
import AssessmentFormFields from "../../AssessmentFormFields";

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
  classes: ClassOption[];
  subjects: SubjectOption[];
  initialClassId?: string;
  initialSubjectId?: string;
};

const initial: AssessmentFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button" disabled={pending}>
      <Save size={16} strokeWidth={2} />
      {pending ? "جاري الحفظ…" : "حفظ التقييم"}
    </button>
  );
}

export default function NewAssessmentForm({
  classes,
  subjects,
  initialClassId,
  initialSubjectId,
}: Props) {
  const [state, formAction] = useActionState(createAssessmentAction, initial);
  return (
    <form action={formAction}>
      {state?.error && <div className="form-error">{state.error}</div>}
      <AssessmentFormFields
        classes={classes}
        subjects={subjects}
        initialClassId={initialClassId}
        initialSubjectId={initialSubjectId}
        values={state?.values}
      />
      <div className="form-actions">
        <SubmitButton />
      </div>
    </form>
  );
}
