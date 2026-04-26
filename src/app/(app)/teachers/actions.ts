"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { assertPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export type TeacherFormState = {
  error?: string;
  values?: Record<string, string>;
};

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData: FormData, key: string): number {
  const value = readField(formData, key);
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type ParsedTeacher = {
  fullName: string;
  nationalId: string;
  specialty: string;
  subjects: string;
  qualification: string;
  yearsOfService: number;
  weeklyLoad: number;
  phone: string;
  email: string;
  notes: string;
  status: string;
};

function parseAndValidate(formData: FormData): {
  ok: true;
  data: ParsedTeacher;
} | {
  ok: false;
  state: TeacherFormState;
} {
  const data: ParsedTeacher = {
    fullName: readField(formData, "fullName"),
    nationalId: readField(formData, "nationalId"),
    specialty: readField(formData, "specialty"),
    subjects: readField(formData, "subjects"),
    qualification: readField(formData, "qualification"),
    yearsOfService: readNumber(formData, "yearsOfService"),
    weeklyLoad: readNumber(formData, "weeklyLoad"),
    phone: readField(formData, "phone"),
    email: readField(formData, "email"),
    notes: readField(formData, "notes"),
    status: readField(formData, "status") || "active",
  };

  const values: Record<string, string> = {
    fullName: data.fullName,
    nationalId: data.nationalId,
    specialty: data.specialty,
    subjects: data.subjects,
    qualification: data.qualification,
    yearsOfService: String(data.yearsOfService),
    weeklyLoad: String(data.weeklyLoad),
    phone: data.phone,
    email: data.email,
    notes: data.notes,
    status: data.status,
  };

  if (!data.fullName) {
    return { ok: false, state: { error: "الاسم الكامل مطلوب", values } };
  }

  if (!/^[0-9]{8,15}$/.test(data.nationalId)) {
    return {
      ok: false,
      state: {
        error: "رقم الهوية يجب أن يكون أرقاما فقط (8 إلى 15 رقم)",
        values,
      },
    };
  }

  if (!data.specialty) {
    return { ok: false, state: { error: "التخصص مطلوب", values } };
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, state: { error: "صيغة البريد الإلكتروني غير صحيحة", values } };
  }

  return { ok: true, data };
}

export async function createTeacherAction(
  _prevState: TeacherFormState,
  formData: FormData,
): Promise<TeacherFormState> {
  await assertPermission("teachers.write");
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;
  const valuesEcho: Record<string, string> = {
    fullName: data.fullName,
    nationalId: data.nationalId,
    specialty: data.specialty,
    subjects: data.subjects,
    qualification: data.qualification,
    yearsOfService: String(data.yearsOfService),
    weeklyLoad: String(data.weeklyLoad),
    phone: data.phone,
    email: data.email,
    notes: data.notes,
    status: data.status,
  };

  try {
    await db.insert(schema.teachers).values({
      fullName: data.fullName,
      nationalId: data.nationalId,
      specialty: data.specialty,
      subjects: data.subjects || null,
      qualification: data.qualification || null,
      yearsOfService: data.yearsOfService,
      weeklyLoad: data.weeklyLoad,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    if (message.includes("teachers_national_id_unique")) {
      return { error: "رقم الهوية مسجل لمعلمة أخرى", values: valuesEcho };
    }
    return { error: `تعذر حفظ المعلمة: ${message}`, values: valuesEcho };
  }

  revalidatePath("/teachers");
  redirect("/teachers");
}

export async function updateTeacherAction(
  id: string,
  _prevState: TeacherFormState,
  formData: FormData,
): Promise<TeacherFormState> {
  await assertPermission("teachers.write");
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;
  const valuesEcho: Record<string, string> = {
    fullName: data.fullName,
    nationalId: data.nationalId,
    specialty: data.specialty,
    subjects: data.subjects,
    qualification: data.qualification,
    yearsOfService: String(data.yearsOfService),
    weeklyLoad: String(data.weeklyLoad),
    phone: data.phone,
    email: data.email,
    notes: data.notes,
    status: data.status,
  };

  try {
    await db
      .update(schema.teachers)
      .set({
        fullName: data.fullName,
        nationalId: data.nationalId,
        specialty: data.specialty,
        subjects: data.subjects || null,
        qualification: data.qualification || null,
        yearsOfService: data.yearsOfService,
        weeklyLoad: data.weeklyLoad,
        phone: data.phone || null,
        email: data.email || null,
        status: data.status,
        notes: data.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.teachers.id, id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    if (message.includes("teachers_national_id_unique")) {
      return { error: "رقم الهوية مسجل لمعلمة أخرى", values: valuesEcho };
    }
    return { error: `تعذر تحديث البيانات: ${message}`, values: valuesEcho };
  }

  revalidatePath("/teachers");
  revalidatePath(`/teachers/${id}`);
  redirect(`/teachers/${id}`);
}

export async function deleteTeacherAction(id: string): Promise<void> {
  await assertPermission("teachers.delete");
  const [row] = await db
    .select({ name: schema.teachers.fullName })
    .from(schema.teachers)
    .where(eq(schema.teachers.id, id))
    .limit(1);
  await db.delete(schema.teachers).where(eq(schema.teachers.id, id));
  await logAudit({
    action: "delete",
    entity: "teacher",
    entityId: id,
    summary: `حذف معلمة: ${row?.name ?? id}`,
  });
  revalidatePath("/teachers");
  redirect("/teachers");
}
