"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Resets the mobile drawer checkbox to unchecked whenever the route changes.
 * Without this, soft navigation through Next.js would keep the drawer open after
 * the user taps a nav link.
 */
export function MobileMenuController({ id }: { id: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const checkbox = document.getElementById(id);
    if (checkbox instanceof HTMLInputElement) {
      checkbox.checked = false;
    }
  }, [pathname, id]);

  return null;
}
