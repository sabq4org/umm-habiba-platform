"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { assertPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export type SubjectFormState = {
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

type ParsedSubject = {
  name: string;
  code: string;
  grade: string;
  weeklyPeriods: number;
  teacherId: string;
  description: string;
  status: string;
  notes: string;
};

function buildValuesEcho(data: ParsedSubject): Record<string, string> {
  return {
    name: data.name,
    code: data.code,
    grade: data.grade,
    weeklyPeriods: String(data.weeklyPeriods),
    teacherId: data.teacherId,
    description: data.description,
    status: data.status,
    notes: data.notes,
  };
}

function parseAndValidate(formData: FormData):
  | { ok: true; data: ParsedSubject }
  | { ok: false; state: SubjectFormState } {
  const data: ParsedSubject = {
    name: readField(formData, "name"),
    code: readField(formData, "code"),
    grade: readField(formData, "grade"),
    weeklyPeriods: readNumber(formData, "weeklyPeriods", 3),
    teacherId: readField(formData, "teacherId"),
    description: readField(formData, "description"),
    status: readField(formData, "status") || "active",
    notes: readField(formData, "notes"),
  };

  const values = buildValuesEcho(data);

  if (!data.name) {
    return { ok: false, state: { error: "اسم المادة مطلوب", values } };
  }
  if (!data.grade) {
    return { ok: false, state: { error: "الصف مطلوب", values } };
  }
  if (data.weeklyPeriods < 1 || data.weeklyPeriods > 15) {
    return {
      ok: false,
      state: { error: "عدد الحصص الأسبوعية يجب أن يكون بين 1 و 15", values },
    };
  }

  return { ok: true, data };
}

export async function createSubjectAction(
  _prevState: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  await assertPermission("subjects.write");
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;
  const valuesEcho = buildValuesEcho(data);

  try {
    await db.insert(schema.subjects).values({
      name: data.name,
      code: data.code || null,
      grade: data.grade,
      weeklyPeriods: data.weeklyPeriods,
      teacherId: data.teacherId || null,
      description: data.description || null,
      notes: data.notes || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    if (message.includes("subjects_name_grade_unique")) {
      return {
        error: "هذه المادة مسجلة لنفس الصف بالفعل",
        values: valuesEcho,
      };
    }
    return { error: `تعذر حفظ المادة: ${message}`, values: valuesEcho };
  }

  revalidatePath("/subjects");
  redirect("/subjects");
}

export async function updateSubjectAction(
  id: string,
  _prevState: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  await assertPermission("subjects.write");
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;
  const valuesEcho = buildValuesEcho(data);

  try {
    await db
      .update(schema.subjects)
      .set({
        name: data.name,
        code: data.code || null,
        grade: data.grade,
        weeklyPeriods: data.weeklyPeriods,
        teacherId: data.teacherId || null,
        description: data.description || null,
        status: data.status,
        notes: data.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.subjects.id, id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    if (message.includes("subjects_name_grade_unique")) {
      return {
        error: "هذه المادة مسجلة لنفس الصف بالفعل",
        values: valuesEcho,
      };
    }
    return { error: `تعذر تحديث المادة: ${message}`, values: valuesEcho };
  }

  revalidatePath("/subjects");
  revalidatePath(`/subjects/${id}`);
  redirect(`/subjects/${id}`);
}

export async function deleteSubjectAction(id: string): Promise<void> {
  await assertPermission("subjects.delete");
  const [row] = await db
    .select({ name: schema.subjects.name, grade: schema.subjects.grade })
    .from(schema.subjects)
    .where(eq(schema.subjects.id, id))
    .limit(1);
  await db.delete(schema.subjects).where(eq(schema.subjects.id, id));
  await logAudit({
    action: "delete",
    entity: "subject",
    entityId: id,
    summary: row ? `حذف مادة: ${row.name} (${row.grade})` : `حذف مادة: ${id}`,
  });
  revalidatePath("/subjects");
  redirect("/subjects");
}
