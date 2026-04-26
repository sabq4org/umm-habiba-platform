"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { assertPermission } from "@/lib/permissions";
import { AUDIENCE_VALUES } from "./constants";

export type AnnouncementFormState = {
  error?: string;
  values?: Record<string, string>;
};

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createAnnouncementAction(
  _prevState: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  await assertPermission("announcements.write");
  const title = readField(formData, "title");
  const body = readField(formData, "body");
  const audienceRaw = readField(formData, "audience") || "all";
  const pinned = formData.get("pinned") === "on";
  const expiresAt = readField(formData, "expiresAt");

  const echo = {
    title,
    body,
    audience: audienceRaw,
    pinned: pinned ? "on" : "",
    expiresAt,
  };

  if (!title) return { error: "العنوان مطلوب", values: echo };
  if (title.length > 180) return { error: "العنوان طويل جداً", values: echo };
  if (!body) return { error: "نص الإعلان مطلوب", values: echo };
  if (!AUDIENCE_VALUES.includes(audienceRaw)) {
    return { error: "الجمهور غير صحيح", values: echo };
  }

  let expires: Date | null = null;
  if (expiresAt) {
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "تاريخ الانتهاء غير صحيح", values: echo };
    }
    expires = parsed;
  }

  const session = await getCurrentSession();

  let createdId: string | undefined;
  try {
    const [row] = await db
      .insert(schema.announcements)
      .values({
        title,
        body,
        audience: audienceRaw,
        pinned,
        expiresAt: expires,
        createdByUserId: session?.userId ?? null,
        createdByLabel: session?.fullName ?? null,
      })
      .returning({ id: schema.announcements.id });
    createdId = row?.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    return { error: `تعذر نشر الإعلان: ${message}`, values: echo };
  }

  await logAudit({
    action: "publish",
    entity: "announcement",
    entityId: createdId,
    summary: `نشر إعلان: ${title}`,
  });

  revalidatePath("/announcements");
  revalidatePath("/");
  redirect("/announcements?published=1");
}

export async function deleteAnnouncementAction(id: string): Promise<void> {
  await assertPermission("announcements.delete");
  const [row] = await db
    .select({ id: schema.announcements.id, title: schema.announcements.title })
    .from(schema.announcements)
    .where(eq(schema.announcements.id, id))
    .limit(1);
  await db.delete(schema.announcements).where(eq(schema.announcements.id, id));
  if (row) {
    await logAudit({
      action: "delete",
      entity: "announcement",
      entityId: id,
      summary: `حذف إعلان: ${row.title}`,
    });
  }
  revalidatePath("/announcements");
  revalidatePath("/");
  redirect("/announcements?deleted=1");
}

export async function togglePinAction(
  id: string,
  pinned: boolean,
): Promise<void> {
  await assertPermission("announcements.write");
  await db
    .update(schema.announcements)
    .set({ pinned, updatedAt: new Date() })
    .where(eq(schema.announcements.id, id));
  await logAudit({
    action: "update",
    entity: "announcement",
    entityId: id,
    summary: pinned ? "تثبيت إعلان" : "إلغاء تثبيت إعلان",
  });
  revalidatePath("/announcements");
}
