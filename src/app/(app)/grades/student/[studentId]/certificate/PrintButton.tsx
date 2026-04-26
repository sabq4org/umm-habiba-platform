"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      className="button"
      onClick={() => window.print()}
    >
      <Printer size={16} strokeWidth={2} />
      طباعة الشهادة
    </button>
  );
}
