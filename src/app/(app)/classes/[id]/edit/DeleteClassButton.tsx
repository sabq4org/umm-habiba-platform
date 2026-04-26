"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteClassAction } from "../../actions";

export function DeleteClassButton({ id, label }: { id: string; label: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      `هل أنتِ متأكدة من حذف الفصل "${label}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
    );
    if (!confirmed) return;
    startTransition(() => {
      deleteClassAction(id);
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
      {isPending ? "جاري الحذف..." : "حذف الفصل"}
    </button>
  );
}
