"use client";

import { useActionState } from "react";
import { updateAdminAction, type AdminFormState } from "../../actions";
import { AdminFormFields } from "../../AdminFormFields";

export function EditAdminForm({
  id,
  values,
}: {
  id: string;
  values: Record<string, string>;
}) {
  const initialState: AdminFormState = { values };
  const action = updateAdminAction.bind(null, id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-grid" noValidate>
      <AdminFormFields state={state} submitLabel="حفظ التعديلات" showStatus />
    </form>
  );
}
