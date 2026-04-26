"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { logAudit } from "@/lib/audit";
import { assertPermission } from "@/lib/permissions";

export type StudentFormState = {
  error?: string;
  values?: Record<string, string>;
};

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLOOD_TYPES = new Set(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

type ParsedStudent = {
  fullName: string;
  nationalId: string;
  grade: string;
  section: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  notes: string;
  status: string;
  // New fields
  dateOfBirth: string;
  nationality: string;
  bloodType: string;
  email: string;
  address: string;
  chronicDiseases: string;
  allergies: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  enrollmentDate: string;
  previousSchool: string;
};

function parseAndValidate(formData: FormData): {
  ok: true;
  data: ParsedStudent;
} | {
  ok: false;
  state: StudentFormState;
} {
  const data: ParsedStudent = {
    fullName: readField(formData, "fullName"),
    nationalId: readField(formData, "nationalId"),
    grade: readField(formData, "grade"),
    section: readField(formData, "section"),
    phone: readField(formData, "phone"),
    guardianName: readField(formData, "guardianName"),
    guardianPhone: readField(formData, "guardianPhone"),
    notes: readField(formData, "notes"),
    status: readField(formData, "status") || "active",
    dateOfBirth: readField(formData, "dateOfBirth"),
    nationality: readField(formData, "nationality"),
    bloodType: readField(formData, "bloodType"),
    email: readField(formData, "email"),
    address: readField(formData, "address"),
    chronicDiseases: readField(formData, "chronicDiseases"),
    allergies: readField(formData, "allergies"),
    emergencyContactName: readField(formData, "emergencyContactName"),
    emergencyContactPhone: readField(formData, "emergencyContactPhone"),
    enrollmentDate: readField(formData, "enrollmentDate"),
    previousSchool: readField(formData, "previousSchool"),
  };

  const values = { ...data };

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

  if (!data.grade) {
    return { ok: false, state: { error: "الصف مطلوب", values } };
  }

  if (!data.section) {
    return { ok: false, state: { error: "الشعبة مطلوبة", values } };
  }

  if (data.dateOfBirth && !ISO_DATE_RE.test(data.dateOfBirth)) {
    return { ok: false, state: { error: "تاريخ الميلاد غير صالح", values } };
  }

  if (data.enrollmentDate && !ISO_DATE_RE.test(data.enrollmentDate)) {
    return { ok: false, state: { error: "تاريخ الالتحاق غير صالح", values } };
  }

  if (data.email && !EMAIL_RE.test(data.email)) {
    return { ok: false, state: { error: "البريد الإلكتروني غير صالح", values } };
  }

  if (data.bloodType && !BLOOD_TYPES.has(data.bloodType)) {
    return { ok: false, state: { error: "فصيلة الدم غير صالحة", values } };
  }

  return { ok: true, data };
}

function buildPersistedValues(data: ParsedStudent) {
  return {
    fullName: data.fullName,
    nationalId: data.nationalId,
    grade: data.grade,
    section: data.section,
    phone: data.phone || null,
    guardianName: data.guardianName || null,
    guardianPhone: data.guardianPhone || null,
    notes: data.notes || null,
    dateOfBirth: data.dateOfBirth || null,
    nationality: data.nationality || null,
    bloodType: data.bloodType || null,
    email: data.email || null,
    address: data.address || null,
    chronicDiseases: data.chronicDiseases || null,
    allergies: data.allergies || null,
    emergencyContactName: data.emergencyContactName || null,
    emergencyContactPhone: data.emergencyContactPhone || null,
    enrollmentDate: data.enrollmentDate || null,
    previousSchool: data.previousSchool || null,
  };
}

export async function createStudentAction(
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  await assertPermission("students.write");
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;

  let createdId: string | undefined;
  try {
    const [row] = await db
      .insert(schema.students)
      .values(buildPersistedValues(data))
      .returning({ id: schema.students.id });
    createdId = row?.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    if (message.includes("students_national_id_unique")) {
      return { error: "رقم الهوية مسجل لطالبة أخرى", values: data };
    }
    return { error: `تعذر حفظ الطالبة: ${message}`, values: data };
  }

  await logAudit({
    action: "create",
    entity: "student",
    entityId: createdId,
    summary: `إضافة طالبة: ${data.fullName} (${data.grade} — ${data.section})`,
  });

  revalidatePath("/students");
  redirect("/students");
}

export async function updateStudentAction(
  id: string,
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  await assertPermission("students.write");
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;

  try {
    await db
      .update(schema.students)
      .set({
        ...buildPersistedValues(data),
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.students.id, id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    if (message.includes("students_national_id_unique")) {
      return { error: "رقم الهوية مسجل لطالبة أخرى", values: data };
    }
    return { error: `تعذر تحديث البيانات: ${message}`, values: data };
  }

  await logAudit({
    action: "update",
    entity: "student",
    entityId: id,
    summary: `تحديث ملف طالبة: ${data.fullName}`,
  });

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  redirect(`/students/${id}`);
}

export async function deleteStudentAction(id: string): Promise<void> {
  await assertPermission("students.delete");
  const [row] = await db
    .select({ name: schema.students.fullName })
    .from(schema.students)
    .where(eq(schema.students.id, id))
    .limit(1);
  await db.delete(schema.students).where(eq(schema.students.id, id));
  await logAudit({
    action: "delete",
    entity: "student",
    entityId: id,
    summary: `حذف طالبة: ${row?.name ?? id}`,
  });
  revalidatePath("/students");
  redirect("/students");
}
