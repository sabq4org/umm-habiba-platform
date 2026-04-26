"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { clearAttendanceAction } from "../../actions";

type Props = {
  scheduleEntryId: string;
  attendanceDate: string;
  classId: string;
};

export default function ClearAttendanceButton({
  scheduleEntryId,
  attendanceDate,
  classId,
}: Props) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (
      !window.confirm(
        "هل أنتِ متأكدة من حذف سجل الحضور لهذه الحصة في هذا التاريخ؟",
      )
    ) {
      return;
    }
    startTransition(async () => {
      await clearAttendanceAction(scheduleEntryId, attendanceDate, classId);
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
      {pending ? "جاري الحذف…" : "حذف سجل هذه الحصة"}
    </button>
  );
}
