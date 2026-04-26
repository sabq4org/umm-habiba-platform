"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { isValidIsoDate, STATUS_VALUES } from "./constants";
import { assertPermission, ForbiddenError } from "@/lib/permissions";
import { canTeacherAccessScheduleEntry, resolveSession } from "@/lib/scope";
import { logAudit } from "@/lib/audit";

export type AttendanceFormState = {
  error?: string;
  ok?: string;
};

export async function recordAttendanceAction(
  scheduleEntryId: string,
  attendanceDate: string,
  _prevState: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  await assertPermission("attendance.write");
  if (!scheduleEntryId) {
    return { error: "الحصة غير محددة" };
  }
  if (!isValidIsoDate(attendanceDate)) {
    return { error: "التاريخ غير صحيح" };
  }

  const session = await resolveSession();
  if (!session) throw new ForbiddenError("يجب تسجيل الدخول");
  const ownsEntry = await canTeacherAccessScheduleEntry(
    session,
    scheduleEntryId,
  );
  if (!ownsEntry) {
    return { error: "هذه الحصة ليست ضمن حصصك" };
  }

  const [entry] = await db
    .select({ classId: schema.scheduleEntries.classId })
    .from(schema.scheduleEntries)
    .where(eq(schema.scheduleEntries.id, scheduleEntryId))
    .limit(1);

  if (!entry) {
    return { error: "الحصة غير موجودة" };
  }

  const recordedBy =
    (formData.get("recordedBy")?.toString().trim() || "إدارة المدرسة").slice(
      0,
      120,
    );

  const studentsInClass = await db
    .select({
      id: schema.students.id,
      grade: schema.students.grade,
      section: schema.students.section,
    })
    .from(schema.students)
    .innerJoin(
      schema.classes,
      and(
        eq(schema.classes.grade, schema.students.grade),
        eq(schema.classes.section, schema.students.section),
      ),
    )
    .where(eq(schema.classes.id, entry.classId));

  if (studentsInClass.length === 0) {
    return { error: "لا توجد طالبات في هذا الفصل بعد" };
  }

  type Row = {
    studentId: string;
    scheduleEntryId: string;
    attendanceDate: string;
    status: string;
    notes: string | null;
    recordedBy: string;
  };

  const rows: Row[] = [];
  for (const student of studentsInClass) {
    const statusRaw = formData.get(`status_${student.id}`);
    const status =
      typeof statusRaw === "string" && STATUS_VALUES.includes(statusRaw as never)
        ? statusRaw
        : "present";
    const notesRaw = formData.get(`notes_${student.id}`);
    const notes =
      typeof notesRaw === "string" && notesRaw.trim().length > 0
        ? notesRaw.trim().slice(0, 500)
        : null;
    rows.push({
      studentId: student.id,
      scheduleEntryId,
      attendanceDate,
      status,
      notes,
      recordedBy,
    });
  }

  try {
    await db
      .insert(schema.attendanceRecords)
      .values(rows)
      .onConflictDoUpdate({
        target: [
          schema.attendanceRecords.studentId,
          schema.attendanceRecords.scheduleEntryId,
          schema.attendanceRecords.attendanceDate,
        ],
        set: {
          status: sql`excluded.status`,
          notes: sql`excluded.notes`,
          recordedBy: sql`excluded.recorded_by`,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    return { error: `تعذر حفظ الحضور: ${message}` };
  }

  await logAudit({
    action: "record",
    entity: "attendance",
    entityId: scheduleEntryId,
    summary: `رصد حضور حصة ${attendanceDate} (${rows.length} طالبة)`,
  });

  revalidatePath("/attendance");
  revalidatePath(`/attendance/class/${entry.classId}`);
  for (const student of studentsInClass) {
    revalidatePath(`/attendance/student/${student.id}`);
    revalidatePath(`/students/${student.id}`);
  }
  redirect(
    `/attendance/class/${entry.classId}?date=${attendanceDate}&saved=1`,
  );
}

export async function clearAttendanceAction(
  scheduleEntryId: string,
  attendanceDate: string,
  classId: string,
): Promise<void> {
  await assertPermission("attendance.write");
  if (!scheduleEntryId || !isValidIsoDate(attendanceDate)) return;
  const session = await resolveSession();
  if (!session) throw new ForbiddenError("يجب تسجيل الدخول");
  const ownsEntry = await canTeacherAccessScheduleEntry(
    session,
    scheduleEntryId,
  );
  if (!ownsEntry) {
    throw new ForbiddenError("هذه الحصة ليست ضمن حصصك");
  }
  await db
    .delete(schema.attendanceRecords)
    .where(
      and(
        eq(schema.attendanceRecords.scheduleEntryId, scheduleEntryId),
        eq(schema.attendanceRecords.attendanceDate, attendanceDate),
      ),
    );
  revalidatePath("/attendance");
  revalidatePath(`/attendance/class/${classId}`);
  redirect(`/attendance/class/${classId}?date=${attendanceDate}&cleared=1`);
}
