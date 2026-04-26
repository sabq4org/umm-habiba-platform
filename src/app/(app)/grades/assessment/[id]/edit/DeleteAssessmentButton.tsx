"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteAssessmentAction } from "../../../actions";

type Props = {
  id: string;
  classId: string;
  subjectId: string;
};

export default function DeleteAssessmentButton({
  id,
  classId,
  subjectId,
}: Props) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (
      !window.confirm(
        "هل أنتِ متأكدة من حذف التقييم وجميع درجاته؟ لا يمكن التراجع.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteAssessmentAction(id, classId, subjectId);
    });
  }

  return (
    <button
      type="button"
      className="danger-button"
      onClick={onClick}
      disabled={pending}
    >
      <Trash2 size={16} strokeWidth={2} />
      {pending ? "جاري الحذف…" : "حذف التقييم"}
    </button>
  );
}
