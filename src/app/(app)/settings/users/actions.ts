"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { assertPermission } from "@/lib/permissions";
import { ROLE_VALUES } from "@/lib/roles";
import { validatePassword } from "@/lib/passwordPolicy";

export type UserFormState = {
  error?: string;
  values?: Record<string, string>;
};

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await assertPermission("users.write");
  const username = readField(formData, "username").toLowerCase();
  const fullName = readField(formData, "fullName");
  const role = readField(formData, "role") || "staff";
  const password = formData.get("password")?.toString() ?? "";
  const linkedStudentId = readField(formData, "linkedStudentId");
  const linkedTeacherId = readField(formData, "linkedTeacherId");
  const linkedAdminId = readField(formData, "linkedAdminId");

  const echo = {
    username,
    fullName,
    role,
    linkedStudentId,
    linkedTeacherId,
    linkedAdminId,
  };

  if (!username) return { error: "اسم المستخدم مطلوب", values: echo };
  if (!/^[a-z0-9_.-]{3,40}$/.test(username)) {
    return {
      error: "اسم المستخدم يجب أن يكون أحرف لاتينية صغيرة وأرقام بدون مسافات",
      values: echo,
    };
  }
  if (!fullName) return { error: "الاسم الكامل مطلوب", values: echo };
  if (fullName.length > 160)
    return { error: "الاسم طويل جداً", values: echo };
  if (!ROLE_VALUES.includes(role as never)) {
    return { error: "الدور غير صحيح", values: echo };
  }
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) {
    return { error: passwordCheck.error, values: echo };
  }

  if (role === "guardian" && !linkedStudentId) {
    return {
      error: "لازم تختاري الطالبة المرتبطة بحساب ولية الأمر",
      values: echo,
    };
  }
  if (role === "teacher" && !linkedTeacherId) {
    return {
      error: "لازم تختاري سجل المعلمة المرتبط بهذا الحساب",
      values: echo,
    };
  }

  let createdId: string | undefined;
  try {
    const passwordHash = await hashPassword(password);
    const [row] = await db
      .insert(schema.users)
      .values({
        username,
        fullName,
        role,
        passwordHash,
        // First-time accounts must rotate the admin-issued password.
        mustChangePassword: true,
        passwordChangedAt: new Date(),
        studentId: role === "guardian" ? linkedStudentId : null,
        teacherId: role === "teacher" ? linkedTeacherId : null,
        adminId:
          role === "admin" || role === "staff"
            ? linkedAdminId || null
            : null,
      })
      .returning({ id: schema.users.id });
    createdId = row?.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    if (message.includes("users_username_unique")) {
      return { error: "اسم المستخدم محجوز", values: echo };
    }
    return { error: `تعذر إنشاء الحساب: ${message}`, values: echo };
  }

  await logAudit({
    action: "create",
    entity: "user",
    entityId: createdId,
    summary: `إنشاء حساب: ${username} (${role})`,
  });

  revalidatePath("/settings/users");
  redirect("/settings/users?created=1");
}

export async function setUserStatusAction(
  id: string,
  status: "active" | "disabled",
): Promise<void> {
  await assertPermission("users.write");
  const [user] = await db
    .select({ username: schema.users.username })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  await db
    .update(schema.users)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.users.id, id));
  await logAudit({
    action: "update",
    entity: "user",
    entityId: id,
    summary: `${status === "active" ? "تفعيل" : "تعطيل"} حساب ${
      user?.username ?? ""
    }`,
  });
  revalidatePath("/settings/users");
}

export async function resetPasswordAction(
  id: string,
  formData: FormData,
): Promise<void> {
  await assertPermission("users.write");
  const password = formData.get("password")?.toString() ?? "";
  const check = validatePassword(password);
  if (!check.ok) {
    redirect(
      `/settings/users?resetError=${encodeURIComponent(check.error)}&resetTarget=${id}`,
    );
  }
  const passwordHash = await hashPassword(password);
  await db
    .update(schema.users)
    .set({
      passwordHash,
      // Force the user to pick their own password the next time they log in.
      mustChangePassword: true,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, id));
  await logAudit({
    action: "update",
    entity: "user",
    entityId: id,
    summary: "إعادة تعيين كلمة المرور (إجبار التغيير عند الدخول)",
  });
  revalidatePath("/settings/users");
  redirect("/settings/users?reset=1");
}

export async function unlockUserAction(id: string): Promise<void> {
  await assertPermission("users.write");
  await db
    .update(schema.users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, id));
  await logAudit({
    action: "update",
    entity: "user",
    entityId: id,
    summary: "فك قفل الحساب",
  });
  revalidatePath("/settings/users");
}
