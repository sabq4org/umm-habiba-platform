"use client";

import { useActionState } from "react";
import { createAdminAction, type AdminFormState } from "../actions";
import { AdminFormFields } from "../AdminFormFields";

const initialState: AdminFormState = {};

export function NewAdminForm() {
  const [state, formAction] = useActionState(createAdminAction, initialState);
  return (
    <form action={formAction} className="form-grid" noValidate>
      <AdminFormFields state={state} submitLabel="حفظ الإدارية" />
    </form>
  );
}
