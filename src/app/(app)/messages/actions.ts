"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { assertPermission } from "@/lib/permissions";
import { ROLE_VALUES } from "@/lib/roles";

export type MessageFormState = {
  error?: string;
  values?: Record<string, string>;
};

export async function sendMessageAction(
  _prev: MessageFormState,
  formData: FormData,
): Promise<MessageFormState> {
  await assertPermission("messages.write");
  const session = await getCurrentSession();
  if (!session) return { error: "يجب تسجيل الدخول" };

  const recipient = formData.get("recipientUserId")?.toString().trim() ?? "";
  const recipientRole =
    formData.get("recipientRole")?.toString().trim() ?? "";
  const subject = (formData.get("subject")?.toString() ?? "").trim();
  const body = (formData.get("body")?.toString() ?? "").trim();

  const echo = { recipientUserId: recipient, recipientRole, subject, body };

  if (!subject) return { error: "الموضوع مطلوب", values: echo };
  if (!body) return { error: "نص الرسالة مطلوب", values: echo };
  if (!recipient && !recipientRole) {
    return { error: "اختاري مستلمة أو فئة", values: echo };
  }
  if (recipientRole && !ROLE_VALUES.includes(recipientRole as never)) {
    return { error: "فئة المستلم غير صحيحة", values: echo };
  }

  let createdId: string | undefined;
  try {
    const [row] = await db
      .insert(schema.messages)
      .values({
        senderUserId: session.userId,
        senderLabel: session.fullName,
        recipientUserId: recipient || null,
        recipientRole: recipient ? null : recipientRole || null,
        subject: subject.slice(0, 200),
        body,
      })
      .returning({ id: schema.messages.id });
    createdId = row?.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    return { error: `تعذر إرسال الرسالة: ${message}`, values: echo };
  }

  await logAudit({
    action: "create",
    entity: "message",
    entityId: createdId,
    summary: `إرسال رسالة: ${subject}`,
  });

  revalidatePath("/messages");
  redirect("/messages?sent=1");
}

export async function markReadAction(id: string): Promise<void> {
  await assertPermission("messages.read");
  const session = await getCurrentSession();
  if (!session) return;
  await db
    .update(schema.messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.messages.id, id),
        eq(schema.messages.recipientUserId, session.userId),
      ),
    );
  revalidatePath("/messages");
}

export async function deleteMessageAction(id: string): Promise<void> {
  await assertPermission("messages.read");
  const session = await getCurrentSession();
  if (!session) return;
  // Only allow deleting messages where the user is sender or recipient.
  await db
    .delete(schema.messages)
    .where(
      and(
        eq(schema.messages.id, id),
        or(
          eq(schema.messages.senderUserId, session.userId),
          eq(schema.messages.recipientUserId, session.userId),
        ),
      ),
    );
  revalidatePath("/messages");
  redirect("/messages?deleted=1");
}
