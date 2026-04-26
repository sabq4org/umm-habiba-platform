"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  authenticate,
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { extractClientIp, verifySameOrigin } from "@/lib/requestSecurity";
import { verifyCsrfToken } from "@/lib/csrf";

export type LoginFormState = {
  error?: string;
  username?: string;
};

export async function signInAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const username = (formData.get("username")?.toString() ?? "").trim();
  const password = formData.get("password")?.toString() ?? "";
  const next = formData.get("next")?.toString() || "/";
  const csrfFromForm = formData.get("csrfToken")?.toString() ?? "";

  const headerList = await headers();

  // Defense-in-depth CSRF checks. Server Actions already include a same-origin
  // check, but we do an explicit Origin/Referer + cookie-anchored token match
  // to harden the login surface against cross-site form submissions.
  if (!verifySameOrigin(headerList)) {
    return { error: "طلب غير مسموح به (Origin)", username };
  }
  const csrfOk = await verifyCsrfToken(csrfFromForm);
  if (!csrfOk) {
    return {
      error: "انتهت صلاحية الجلسة، يرجى تحديث الصفحة والمحاولة مجدداً",
      username,
    };
  }

  const ip = extractClientIp(headerList);
  const userAgent = headerList.get("user-agent");

  const result = await authenticate(username, password, {
    ip,
    userAgent: userAgent ?? null,
  });
  if (!result.ok) {
    return { error: result.error, username };
  }

  await setSessionCookie(result.session);
  await logAudit({
    action: "login",
    entity: "user",
    entityId: result.session.userId,
    summary: `تسجيل دخول: ${result.session.fullName}`,
    actor: {
      userId: result.session.userId,
      label: result.session.fullName,
    },
  });

  if (result.session.mustChangePassword) {
    redirect("/change-password?required=1");
  }
  redirect(next.startsWith("/") ? next : "/");
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
