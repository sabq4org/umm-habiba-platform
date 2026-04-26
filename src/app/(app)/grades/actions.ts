"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { KIND_VALUES, TERMS } from "./constants";
import { assertPermission, ForbiddenError } from "@/lib/permissions";
import { canTeacherAccessAssessment, resolveSession } from "@/lib/scope";
import { logAudit } from "@/lib/audit";

export type AssessmentFormState = {
  error?: string;
  values?: Record<string, string>;
};

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(
  formData: FormData,
  key: string,
  fallback = 0,
): number {
  const value = readField(formData, key);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type ParsedAssessment = {
  classId: string;
  subjectId: string;
  name: string;
  kind: string;
  term: string;
  maxScore: number;
  weight: number;
  dueDate: string | null;
  notes: string;
};

function buildEcho(data: ParsedAssessment): Record<string, string> {
  return {
    classId: data.classId,
    subjectId: data.subjectId,
    name: data.name,
    kind: data.kind,
    term: data.term,
    maxScore: String(data.maxScore),
    weight: String(data.weight),
    dueDate: data.dueDate ?? "",
    notes: data.notes,
  };
}

function parseAndValidate(formData: FormData):
  | { ok: true; data: ParsedAssessment }
  | { ok: false; state: AssessmentFormState } {
  const data: ParsedAssessment = {
    classId: readField(formData, "classId"),
    subjectId: readField(formData, "subjectId"),
    name: readField(formData, "name"),
    kind: readField(formData, "kind") || "quiz",
    term: readField(formData, "term") || "الفصل الأول",
    maxScore: readNumber(formData, "maxScore", 100),
    weight: readNumber(formData, "weight", 0),
    dueDate: readField(formData, "dueDate") || null,
    notes: readField(formData, "notes"),
  };

  const values = buildEcho(data);

  if (!data.classId) return { ok: false, state: { error: "الفصل مطلوب", values } };
  if (!data.subjectId)
    return { ok: false, state: { error: "المادة مطلوبة", values } };
  if (!data.name) return { ok: false, state: { error: "اسم التقييم مطلوب", values } };
  if (data.name.length > 120)
    return { ok: false, state: { error: "اسم التقييم طويل جداً", values } };
  if (!KIND_VALUES.includes(data.kind as never))
    return { ok: false, state: { error: "نوع التقييم غير صحيح", values } };
  if (!TERMS.includes(data.term as never))
    return { ok: false, state: { error: "الفصل الدراسي غير صحيح", values } };
  if (data.maxScore <= 0 || data.maxScore > 1000)
    return {
      ok: false,
      state: { error: "الدرجة العظمى يجب أن تكون بين 1 و 1000", values },
    };
  if (data.weight < 0 || data.weight > 100)
    return {
      ok: false,
      state: { error: "الوزن يجب أن يكون بين 0 و 100", values },
    };

  return { ok: true, data };
}

export async function createAssessmentAction(
  _prevState: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  await assertPermission("grades.write");
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;
  const echo = buildEcho(data);

  let createdId: string | undefined;
  try {
    const [row] = await db
      .insert(schema.assessments)
      .values({
        classId: data.classId,
        subjectId: data.subjectId,
        name: data.name,
        kind: data.kind,
        term: data.term,
        maxScore: data.maxScore,
        weight: data.weight,
        dueDate: data.dueDate,
        notes: data.notes || null,
      })
      .returning({ id: schema.assessments.id });
    createdId = row?.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    if (message.includes("assessments_class_subject_term_name_unique")) {
      return {
        error: "يوجد تقييم بنفس الاسم لهذه المادة في الفصل الدراسي نفسه",
        values: echo,
      };
    }
    return { error: `تعذر حفظ التقييم: ${message}`, values: echo };
  }

  revalidatePath("/grades");
  revalidatePath(`/grades/class/${data.classId}`);
  revalidatePath(`/grades/class/${data.classId}/subject/${data.subjectId}`);

  redirect(
    createdId ? `/grades/assessment/${createdId}` : `/grades/class/${data.classId}/subject/${data.subjectId}`,
  );
}

export async function updateAssessmentAction(
  id: string,
  _prevState: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  await assertPermission("grades.write");
  const session = await resolveSession();
  if (!session) throw new ForbiddenError();
  if (session.role === "teacher") {
    const ownsAssessment = await canTeacherAccessAssessment(session, id);
    if (!ownsAssessment) {
      return { error: "هذا التقييم ليس ضمن مواد فصولك" };
    }
  }
  const parsed = parseAndValidate(formData);
  if (!parsed.ok) return parsed.state;

  const { data } = parsed;
  const echo = buildEcho(data);

  try {
    await db
      .update(schema.assessments)
      .set({
        classId: data.classId,
        subjectId: data.subjectId,
        name: data.name,
        kind: data.kind,
        term: data.term,
        maxScore: data.maxScore,
        weight: data.weight,
        dueDate: data.dueDate,
        notes: data.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.assessments.id, id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    if (message.includes("assessments_class_subject_term_name_unique")) {
      return {
        error: "يوجد تقييم بنفس الاسم لهذه المادة في الفصل الدراسي نفسه",
        values: echo,
      };
    }
    return { error: `تعذر تحديث التقييم: ${message}`, values: echo };
  }

  revalidatePath("/grades");
  revalidatePath(`/grades/class/${data.classId}`);
  revalidatePath(`/grades/class/${data.classId}/subject/${data.subjectId}`);
  revalidatePath(`/grades/assessment/${id}`);
  redirect(`/grades/assessment/${id}`);
}

export async function deleteAssessmentAction(
  id: string,
  classId: string,
  subjectId: string,
): Promise<void> {
  await assertPermission("grades.write");
  const session = await resolveSession();
  if (!session) throw new ForbiddenError();
  if (session.role === "teacher") {
    const ownsAssessment = await canTeacherAccessAssessment(session, id);
    if (!ownsAssessment) {
      throw new ForbiddenError("هذا التقييم ليس ضمن مواد فصولك");
    }
  }
  await db.delete(schema.assessments).where(eq(schema.assessments.id, id));
  await logAudit({
    action: "delete",
    entity: "assessment",
    entityId: id,
    summary: `حذف تقييم ${id}`,
  });
  revalidatePath("/grades");
  revalidatePath(`/grades/class/${classId}`);
  revalidatePath(`/grades/class/${classId}/subject/${subjectId}`);
  redirect(`/grades/class/${classId}/subject/${subjectId}`);
}

export type GradesFormState = {
  error?: string;
};

export async function recordGradesAction(
  assessmentId: string,
  _prevState: GradesFormState,
  formData: FormData,
): Promise<GradesFormState> {
  await assertPermission("grades.write");
  if (!assessmentId) return { error: "التقييم غير محدد" };

  const session = await resolveSession();
  if (!session) return { error: "يجب تسجيل الدخول" };
  if (session.role === "teacher") {
    const ownsAssessment = await canTeacherAccessAssessment(
      session,
      assessmentId,
    );
    if (!ownsAssessment) {
      return { error: "هذا التقييم ليس ضمن مواد فصولك" };
    }
  }

  const [assessment] = await db
    .select({
      id: schema.assessments.id,
      classId: schema.assessments.classId,
      subjectId: schema.assessments.subjectId,
      maxScore: schema.assessments.maxScore,
    })
    .from(schema.assessments)
    .where(eq(schema.assessments.id, assessmentId))
    .limit(1);

  if (!assessment) return { error: "التقييم غير موجود" };

  const [cls] = await db
    .select({ grade: schema.classes.grade, section: schema.classes.section })
    .from(schema.classes)
    .where(eq(schema.classes.id, assessment.classId))
    .limit(1);

  if (!cls) return { error: "الفصل غير موجود" };

  const studentsInClass = await db
    .select({ id: schema.students.id })
    .from(schema.students)
    .where(
      and(
        eq(schema.students.grade, cls.grade),
        eq(schema.students.section, cls.section),
      ),
    );

  if (studentsInClass.length === 0) {
    return { error: "لا توجد طالبات مسجلات في هذا الفصل" };
  }

  const recordedBy =
    (formData.get("recordedBy")?.toString().trim() || "إدارة المدرسة").slice(
      0,
      120,
    );

  type Row = {
    assessmentId: string;
    studentId: string;
    score: number | null;
    notes: string | null;
    recordedBy: string;
  };

  const rows: Row[] = [];
  for (const student of studentsInClass) {
    const raw = formData.get(`score_${student.id}`);
    const noteRaw = formData.get(`notes_${student.id}`);

    let score: number | null = null;
    if (typeof raw === "string" && raw.trim() !== "") {
      const parsed = Number(raw.trim());
      if (!Number.isFinite(parsed)) {
        return { error: "قيمة درجة غير صالحة" };
      }
      if (parsed < 0 || parsed > assessment.maxScore) {
        return {
          error: `الدرجة يجب أن تكون بين 0 و ${assessment.maxScore}`,
        };
      }
      score = Math.round(parsed);
    }

    const notes =
      typeof noteRaw === "string" && noteRaw.trim()
        ? noteRaw.trim().slice(0, 500)
        : null;

    rows.push({
      assessmentId,
      studentId: student.id,
      score,
      notes,
      recordedBy,
    });
  }

  try {
    await db
      .insert(schema.studentGrades)
      .values(rows)
      .onConflictDoUpdate({
        target: [
          schema.studentGrades.assessmentId,
          schema.studentGrades.studentId,
        ],
        set: {
          score: sql`excluded.score`,
          notes: sql`excluded.notes`,
          recordedBy: sql`excluded.recorded_by`,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    return { error: `تعذر حفظ الدرجات: ${message}` };
  }

  await logAudit({
    action: "record",
    entity: "grade",
    entityId: assessmentId,
    summary: `رصد درجات تقييم (${rows.length} طالبة)`,
  });

  revalidatePath("/grades");
  revalidatePath(`/grades/class/${assessment.classId}`);
  revalidatePath(
    `/grades/class/${assessment.classId}/subject/${assessment.subjectId}`,
  );
  revalidatePath(`/grades/assessment/${assessmentId}`);
  for (const student of studentsInClass) {
    revalidatePath(`/grades/student/${student.id}`);
    revalidatePath(`/students/${student.id}`);
  }

  redirect(`/grades/assessment/${assessmentId}?saved=1`);
}
