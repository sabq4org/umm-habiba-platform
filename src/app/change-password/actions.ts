"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  getCurrentSession,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { validatePassword } from "@/lib/passwordPolicy";
import { isRole } from "@/lib/roles";

export type ChangePasswordState = {
  error?: string;
  success?: boolean;
};

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const currentPassword = formData.get("currentPassword")?.toString() ?? "";
  const newPassword = formData.get("newPassword")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!currentPassword || !newPassword) {
    return { error: "كل الحقول مطلوبة" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "تأكيد كلمة المرور غير مطابق" };
  }
  if (newPassword === currentPassword) {
    return { error: "كلمة المرور الجديدة يجب أن تختلف عن الحالية" };
  }
  const check = validatePassword(newPassword);
  if (!check.ok) {
    return { error: check.error };
  }

  const [user] = await db
    .select({
      id: schema.users.id,
      passwordHash: schema.users.passwordHash,
      role: schema.users.role,
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);

  if (!user) {
    redirect("/login");
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    return { error: "كلمة المرور الحالية غير صحيحة" };
  }

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(schema.users)
    .set({
      passwordHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, user.id));

  await logAudit({
    action: "update",
    entity: "user",
    entityId: user.id,
    summary: "تغيير كلمة المرور بواسطة المستخدمة",
    actor: { userId: session.userId, label: session.fullName },
  });

  // Refresh the session cookie so the must-change flag is cleared everywhere.
  if (isRole(session.role)) {
    await setSessionCookie({
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      role: session.role,
      mustChangePassword: false,
    });
  }

  redirect("/?passwordChanged=1");
}
