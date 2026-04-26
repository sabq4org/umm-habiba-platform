"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { assertPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export type ClassFormState = {
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

type ParsedClass = {
  grade: string;
  section: string;
  academicYear: string;
  homeroomTeacherId: string;
  capacity: number;
  room: string;
  status: string;
  notes: string;
};

function buildValuesEcho(data: ParsedClass): Record<string, string> {
  return {
    grade: data.grade,
    section: data.section,
    academicYear: data.academicYear,
    homeroomTeacherId: data.homeroomTeacherId,
    capacity: String(data.capacity),
    room: data.room,
    status: data.status,
    notes: data.notes,
  };
}

function parseAndValidate(formData: FormData):
  | { ok: true; data: ParsedClass }
  | { ok: false; state: ClassFormState } {
  const data: ParsedClass = {
    grade: readField(formData, "grade"),
    section: readField(formData, "section"),
    academicYear: readField(formData, "academicYear"),
    homeroomTeacherId: readField(formData, "homeroomTeacherId"),
    capacity: readNumber(formData, "capacity", 30),
    room: readField(formData, "room"),
    status: readField(formData, "status") || "active",
    notes: readField(formData, "notes"),
  };

  const values = buildValuesEcho(data);

  if (!data.grade) {
    return { ok: false, state: { error: "الصف مطلوب", values } };
  }
  if (!data.section) {
    return { ok: false, state: { error: "رمز الشعبة مطلوب", values } };
  }
  if (!data.academicYear) {
    return { ok: false, state: { error: "العام الدراسي مطلوب", values } };
  }
  if (data.capacity < 1 || data.capacity > 60) {
    return { ok: false, state: { error: "السعة يجب أن تكون بين 1 و 60", values } };
  }

  return { ok: true, data };
}

export async function createClassAction(
  _prevState: ClassFormState,
  formData: FormData,
): Promise<ClassFormState> {
  await assertPermission("classes.write");
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;
  const valuesEcho = buildValuesEcho(data);

  try {
    await db.insert(schema.classes).values({
      grade: data.grade,
      section: data.section,
      academicYear: data.academicYear,
      homeroomTeacherId: data.homeroomTeacherId || null,
      capacity: data.capacity,
      room: data.room || null,
      notes: data.notes || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    if (message.includes("classes_grade_section_year_unique")) {
      return {
        error: "هذا الفصل (الصف + الشعبة + العام) مسجل مسبقا",
        values: valuesEcho,
      };
    }
    return { error: `تعذر حفظ الفصل: ${message}`, values: valuesEcho };
  }

  revalidatePath("/classes");
  redirect("/classes");
}

export async function updateClassAction(
  id: string,
  _prevState: ClassFormState,
  formData: FormData,
): Promise<ClassFormState> {
  await assertPermission("classes.write");
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;
  const valuesEcho = buildValuesEcho(data);

  try {
    await db
      .update(schema.classes)
      .set({
        grade: data.grade,
        section: data.section,
        academicYear: data.academicYear,
        homeroomTeacherId: data.homeroomTeacherId || null,
        capacity: data.capacity,
        room: data.room || null,
        status: data.status,
        notes: data.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.classes.id, id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    if (message.includes("classes_grade_section_year_unique")) {
      return {
        error: "هذا الفصل (الصف + الشعبة + العام) مسجل مسبقا",
        values: valuesEcho,
      };
    }
    return { error: `تعذر تحديث الفصل: ${message}`, values: valuesEcho };
  }

  revalidatePath("/classes");
  revalidatePath(`/classes/${id}`);
  redirect(`/classes/${id}`);
}

export async function deleteClassAction(id: string): Promise<void> {
  await assertPermission("classes.delete");
  const [row] = await db
    .select({
      grade: schema.classes.grade,
      section: schema.classes.section,
    })
    .from(schema.classes)
    .where(eq(schema.classes.id, id))
    .limit(1);
  await db.delete(schema.classes).where(eq(schema.classes.id, id));
  await logAudit({
    action: "delete",
    entity: "class",
    entityId: id,
    summary: row ? `حذف فصل: ${row.grade} — ${row.section}` : `حذف فصل: ${id}`,
  });
  revalidatePath("/classes");
  redirect("/classes");
}
