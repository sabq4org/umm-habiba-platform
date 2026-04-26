"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { assertPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export type AdminFormState = {
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

type ParsedAdmin = {
  fullName: string;
  nationalId: string;
  jobTitle: string;
  department: string;
  responsibilities: string;
  qualification: string;
  yearsOfService: number;
  phone: string;
  email: string;
  notes: string;
  status: string;
};

function buildValuesEcho(data: ParsedAdmin): Record<string, string> {
  return {
    fullName: data.fullName,
    nationalId: data.nationalId,
    jobTitle: data.jobTitle,
    department: data.department,
    responsibilities: data.responsibilities,
    qualification: data.qualification,
    yearsOfService: String(data.yearsOfService),
    phone: data.phone,
    email: data.email,
    notes: data.notes,
    status: data.status,
  };
}

function parseAndValidate(formData: FormData): {
  ok: true;
  data: ParsedAdmin;
} | {
  ok: false;
  state: AdminFormState;
} {
  const data: ParsedAdmin = {
    fullName: readField(formData, "fullName"),
    nationalId: readField(formData, "nationalId"),
    jobTitle: readField(formData, "jobTitle"),
    department: readField(formData, "department"),
    responsibilities: readField(formData, "responsibilities"),
    qualification: readField(formData, "qualification"),
    yearsOfService: readNumber(formData, "yearsOfService"),
    phone: readField(formData, "phone"),
    email: readField(formData, "email"),
    notes: readField(formData, "notes"),
    status: readField(formData, "status") || "active",
  };

  const values = buildValuesEcho(data);

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

  if (!data.jobTitle) {
    return { ok: false, state: { error: "المسمى الوظيفي مطلوب", values } };
  }

  if (!data.department) {
    return { ok: false, state: { error: "القسم مطلوب", values } };
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, state: { error: "صيغة البريد الإلكتروني غير صحيحة", values } };
  }

  return { ok: true, data };
}

export async function createAdminAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await assertPermission("admins.write");
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;
  const valuesEcho = buildValuesEcho(data);

  try {
    await db.insert(schema.admins).values({
      fullName: data.fullName,
      nationalId: data.nationalId,
      jobTitle: data.jobTitle,
      department: data.department,
      responsibilities: data.responsibilities || null,
      qualification: data.qualification || null,
      yearsOfService: data.yearsOfService,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    if (message.includes("admins_national_id_unique")) {
      return { error: "رقم الهوية مسجل لإدارية أخرى", values: valuesEcho };
    }
    return { error: `تعذر حفظ الإدارية: ${message}`, values: valuesEcho };
  }

  revalidatePath("/admins");
  redirect("/admins");
}

export async function updateAdminAction(
  id: string,
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await assertPermission("admins.write");
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;
  const valuesEcho = buildValuesEcho(data);

  try {
    await db
      .update(schema.admins)
      .set({
        fullName: data.fullName,
        nationalId: data.nationalId,
        jobTitle: data.jobTitle,
        department: data.department,
        responsibilities: data.responsibilities || null,
        qualification: data.qualification || null,
        yearsOfService: data.yearsOfService,
        phone: data.phone || null,
        email: data.email || null,
        status: data.status,
        notes: data.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.admins.id, id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    if (message.includes("admins_national_id_unique")) {
      return { error: "رقم الهوية مسجل لإدارية أخرى", values: valuesEcho };
    }
    return { error: `تعذر تحديث البيانات: ${message}`, values: valuesEcho };
  }

  revalidatePath("/admins");
  revalidatePath(`/admins/${id}`);
  redirect(`/admins/${id}`);
}

export async function deleteAdminAction(id: string): Promise<void> {
  await assertPermission("admins.delete");
  const [row] = await db
    .select({ name: schema.admins.fullName })
    .from(schema.admins)
    .where(eq(schema.admins.id, id))
    .limit(1);
  await db.delete(schema.admins).where(eq(schema.admins.id, id));
  await logAudit({
    action: "delete",
    entity: "admin",
    entityId: id,
    summary: `حذف إدارية: ${row?.name ?? id}`,
  });
  revalidatePath("/admins");
  redirect("/admins");
}
