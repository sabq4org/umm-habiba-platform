"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { DAYS_OF_WEEK, TOTAL_PERIODS } from "./constants";
import { assertPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export type ScheduleFormState = {
  error?: string;
  values?: Record<string, string>;
};

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData: FormData, key: string, fallback = 0): number {
  const value = readField(formData, key);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type ParsedSchedule = {
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: string;
  period: number;
  notes: string;
};

function buildValuesEcho(data: ParsedSchedule): Record<string, string> {
  return {
    classId: data.classId,
    subjectId: data.subjectId,
    teacherId: data.teacherId,
    dayOfWeek: data.dayOfWeek,
    period: String(data.period),
    notes: data.notes,
  };
}

function parseAndValidate(formData: FormData):
  | { ok: true; data: ParsedSchedule }
  | { ok: false; state: ScheduleFormState } {
  const data: ParsedSchedule = {
    classId: readField(formData, "classId"),
    subjectId: readField(formData, "subjectId"),
    teacherId: readField(formData, "teacherId"),
    dayOfWeek: readField(formData, "dayOfWeek"),
    period: readNumber(formData, "period", 1),
    notes: readField(formData, "notes"),
  };

  const values = buildValuesEcho(data);

  if (!data.classId) {
    return { ok: false, state: { error: "الفصل مطلوب", values } };
  }
  if (!data.subjectId) {
    return { ok: false, state: { error: "المادة مطلوبة", values } };
  }
  if (!data.dayOfWeek || !DAYS_OF_WEEK.includes(data.dayOfWeek as (typeof DAYS_OF_WEEK)[number])) {
    return { ok: false, state: { error: "اليوم غير صحيح", values } };
  }
  if (data.period < 1 || data.period > TOTAL_PERIODS) {
    return {
      ok: false,
      state: { error: `رقم الحصة يجب أن يكون بين 1 و ${TOTAL_PERIODS}`, values },
    };
  }

  return { ok: true, data };
}

async function checkConflicts(
  data: ParsedSchedule,
  excludeId?: string,
): Promise<string | null> {
  const classConflict = await db
    .select({ id: schema.scheduleEntries.id })
    .from(schema.scheduleEntries)
    .where(
      and(
        eq(schema.scheduleEntries.classId, data.classId),
        eq(schema.scheduleEntries.dayOfWeek, data.dayOfWeek),
        eq(schema.scheduleEntries.period, data.period),
        excludeId ? ne(schema.scheduleEntries.id, excludeId) : undefined,
      ),
    )
    .limit(1);

  if (classConflict.length > 0) {
    return "يوجد حصة مسجلة لهذا الفصل في نفس اليوم والحصة";
  }

  if (data.teacherId) {
    const teacherConflict = await db
      .select({ id: schema.scheduleEntries.id })
      .from(schema.scheduleEntries)
      .where(
        and(
          eq(schema.scheduleEntries.teacherId, data.teacherId),
          eq(schema.scheduleEntries.dayOfWeek, data.dayOfWeek),
          eq(schema.scheduleEntries.period, data.period),
          excludeId ? ne(schema.scheduleEntries.id, excludeId) : undefined,
        ),
      )
      .limit(1);

    if (teacherConflict.length > 0) {
      return "المعلمة مرتبطة بحصة أخرى في نفس اليوم والوقت";
    }
  }

  return null;
}

export async function createScheduleAction(
  _prevState: ScheduleFormState,
  formData: FormData,
): Promise<ScheduleFormState> {
  await assertPermission("schedules.write");
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;
  const valuesEcho = buildValuesEcho(data);

  const conflict = await checkConflicts(data);
  if (conflict) {
    return { error: conflict, values: valuesEcho };
  }

  let createdId: string | undefined;
  try {
    const [row] = await db
      .insert(schema.scheduleEntries)
      .values({
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId || null,
        dayOfWeek: data.dayOfWeek,
        period: data.period,
        notes: data.notes || null,
      })
      .returning({ id: schema.scheduleEntries.id });
    createdId = row?.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    return { error: `تعذر حفظ الحصة: ${message}`, values: valuesEcho };
  }

  revalidatePath("/schedules");
  revalidatePath(`/schedules/class/${data.classId}`);
  if (data.teacherId) {
    revalidatePath(`/schedules/teacher/${data.teacherId}`);
  }
  redirect(
    createdId
      ? `/schedules/class/${data.classId}`
      : "/schedules",
  );
}

export async function updateScheduleAction(
  id: string,
  _prevState: ScheduleFormState,
  formData: FormData,
): Promise<ScheduleFormState> {
  await assertPermission("schedules.write");
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;
  const valuesEcho = buildValuesEcho(data);

  const conflict = await checkConflicts(data, id);
  if (conflict) {
    return { error: conflict, values: valuesEcho };
  }

  try {
    await db
      .update(schema.scheduleEntries)
      .set({
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId || null,
        dayOfWeek: data.dayOfWeek,
        period: data.period,
        notes: data.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.scheduleEntries.id, id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    return { error: `تعذر تحديث الحصة: ${message}`, values: valuesEcho };
  }

  revalidatePath("/schedules");
  revalidatePath(`/schedules/class/${data.classId}`);
  if (data.teacherId) {
    revalidatePath(`/schedules/teacher/${data.teacherId}`);
  }
  redirect(`/schedules/class/${data.classId}`);
}

export async function deleteScheduleAction(
  id: string,
  classId: string,
  teacherId?: string,
): Promise<void> {
  await assertPermission("schedules.delete");
  await db.delete(schema.scheduleEntries).where(eq(schema.scheduleEntries.id, id));
  await logAudit({
    action: "delete",
    entity: "schedule",
    entityId: id,
    summary: `حذف حصة من جدول الفصل ${classId}`,
  });
  revalidatePath("/schedules");
  revalidatePath(`/schedules/class/${classId}`);
  if (teacherId) {
    revalidatePath(`/schedules/teacher/${teacherId}`);
  }
  redirect(`/schedules/class/${classId}`);
}
