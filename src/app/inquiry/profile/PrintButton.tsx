"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      className="ghost-button no-print"
      onClick={() => window.print()}
    >
      <Printer size={16} strokeWidth={2} />
      طباعة
    </button>
  );
}
