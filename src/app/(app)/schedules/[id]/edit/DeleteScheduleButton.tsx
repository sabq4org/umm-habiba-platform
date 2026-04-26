"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteScheduleAction } from "../../actions";

export function DeleteScheduleButton({
  id,
  classId,
  teacherId,
}: {
  id: string;
  classId: string;
  teacherId?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      "هل أنتِ متأكدة من حذف هذه الحصة من الجدول؟ هذا الإجراء لا يمكن التراجع عنه.",
    );
    if (!confirmed) return;
    startTransition(() => {
      deleteScheduleAction(id, classId, teacherId);
    });
  }

  return (
    <button
      className="button button-danger"
      type="button"
      onClick={handleClick}
      disabled={isPending}
    >
      <Trash2 size={18} strokeWidth={2} />
      {isPending ? "جاري الحذف..." : "حذف الحصة"}
    </button>
  );
}
