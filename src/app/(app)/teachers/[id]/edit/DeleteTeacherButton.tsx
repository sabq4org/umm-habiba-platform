"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteTeacherAction } from "../../actions";

export function DeleteTeacherButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      `هل أنتِ متأكدة من حذف ملف المعلمة "${name}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
    );
    if (!confirmed) return;
    startTransition(() => {
      deleteTeacherAction(id);
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
      {isPending ? "جاري الحذف..." : "حذف الملف"}
    </button>
  );
}
