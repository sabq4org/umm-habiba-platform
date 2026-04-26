import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentSession, type SessionData } from "./auth";
import { isRole } from "./roles";

/**
 * Scope helpers: convert a session into the resources they are entitled to access.
 *
 * - Admins/staff: full access (these helpers return null/empty arrays).
 * - Teachers: linked to a row in `teachers` via users.teacherId. They access
 *   only the schedule entries (and derived classes/students) that match.
 * - Guardians: linked to a row in `students` via users.studentId. They access
 *   only that student's data.
 */

export type ResolvedSession = SessionData & {
  teacherRecordId: string | null;
  studentRecordId: string | null;
  adminRecordId: string | null;
};

export async function resolveSession(): Promise<ResolvedSession | null> {
  const session = await getCurrentSession();
  if (!session) return null;
  const [row] = await db
    .select({
      teacherId: schema.users.teacherId,
      studentId: schema.users.studentId,
      adminId: schema.users.adminId,
      fullName: schema.users.fullName,
      role: schema.users.role,
      mustChangePassword: schema.users.mustChangePassword,
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);

  return {
    ...session,
    fullName: row?.fullName ?? session.fullName,
    role: row && isRole(row.role) ? row.role : session.role,
    mustChangePassword: row?.mustChangePassword ?? session.mustChangePassword,
    teacherRecordId: row?.teacherId ?? null,
    studentRecordId: row?.studentId ?? null,
    adminRecordId: row?.adminId ?? null,
  };
}

export function isUnrestricted(role: string): boolean {
  return role === "admin" || role === "staff";
}

/**
 * Returns the set of student IDs a teacher can see (students in classes the
 * teacher has at least one schedule entry for). Returns null if not a teacher
 * or unrestricted.
 */
export async function teacherStudentIds(
  teacherRecordId: string,
): Promise<Set<string>> {
  const entries = await db
    .select({
      grade: schema.classes.grade,
      section: schema.classes.section,
    })
    .from(schema.scheduleEntries)
    .innerJoin(
      schema.classes,
      eq(schema.classes.id, schema.scheduleEntries.classId),
    )
    .where(eq(schema.scheduleEntries.teacherId, teacherRecordId));

  const keys = new Set(entries.map((e) => `${e.grade}|${e.section}`));
  if (keys.size === 0) return new Set();

  const studs = await db
    .select({
      id: schema.students.id,
      grade: schema.students.grade,
      section: schema.students.section,
    })
    .from(schema.students);

  return new Set(
    studs
      .filter((s) => keys.has(`${s.grade}|${s.section}`))
      .map((s) => s.id),
  );
}

export async function teacherClassIds(
  teacherRecordId: string,
): Promise<Set<string>> {
  const entries = await db
    .select({ classId: schema.scheduleEntries.classId })
    .from(schema.scheduleEntries)
    .where(eq(schema.scheduleEntries.teacherId, teacherRecordId));
  return new Set(entries.map((e) => e.classId));
}

export async function teacherScheduleEntryIds(
  teacherRecordId: string,
): Promise<Set<string>> {
  const entries = await db
    .select({ id: schema.scheduleEntries.id })
    .from(schema.scheduleEntries)
    .where(eq(schema.scheduleEntries.teacherId, teacherRecordId));
  return new Set(entries.map((e) => e.id));
}

export async function teacherAssessmentIds(
  teacherRecordId: string,
): Promise<Set<string>> {
  const classIds = await teacherClassIds(teacherRecordId);
  if (classIds.size === 0) return new Set();
  const all = await db
    .select({
      id: schema.assessments.id,
      classId: schema.assessments.classId,
      subjectId: schema.assessments.subjectId,
    })
    .from(schema.assessments);

  const subjectsByTeacher = await db
    .select({ id: schema.subjects.id })
    .from(schema.subjects)
    .where(eq(schema.subjects.teacherId, teacherRecordId));
  const subjectIds = new Set(subjectsByTeacher.map((s) => s.id));

  return new Set(
    all
      .filter(
        (a) =>
          classIds.has(a.classId) &&
          (subjectIds.size === 0 || subjectIds.has(a.subjectId)),
      )
      .map((a) => a.id),
  );
}

/**
 * Confirms that a teacher owns a given schedule entry (i.e. is assigned to
 * teach it). Returns true also for admins/staff.
 */
export async function canTeacherAccessScheduleEntry(
  session: ResolvedSession,
  scheduleEntryId: string,
): Promise<boolean> {
  if (isUnrestricted(session.role)) return true;
  if (session.role !== "teacher" || !session.teacherRecordId) return false;
  const [row] = await db
    .select({ teacherId: schema.scheduleEntries.teacherId })
    .from(schema.scheduleEntries)
    .where(eq(schema.scheduleEntries.id, scheduleEntryId))
    .limit(1);
  return row?.teacherId === session.teacherRecordId;
}

export async function canTeacherAccessAssessment(
  session: ResolvedSession,
  assessmentId: string,
): Promise<boolean> {
  if (isUnrestricted(session.role)) return true;
  if (session.role !== "teacher" || !session.teacherRecordId) return false;
  const [row] = await db
    .select({
      classId: schema.assessments.classId,
      subjectId: schema.assessments.subjectId,
    })
    .from(schema.assessments)
    .where(eq(schema.assessments.id, assessmentId))
    .limit(1);
  if (!row) return false;
  const classIds = await teacherClassIds(session.teacherRecordId);
  if (!classIds.has(row.classId)) return false;
  const [subj] = await db
    .select({ teacherId: schema.subjects.teacherId })
    .from(schema.subjects)
    .where(eq(schema.subjects.id, row.subjectId))
    .limit(1);
  // Allow if the subject is taught by this teacher OR the subject has no owner
  // (some assessments may exist for cross-cutting subjects).
  return !subj?.teacherId || subj.teacherId === session.teacherRecordId;
}

/**
 * For guardians: ensures they only access their own linked student.
 */
export function guardianCanAccessStudent(
  session: ResolvedSession,
  studentId: string,
): boolean {
  if (isUnrestricted(session.role)) return true;
  if (session.role === "teacher") return true;
  if (session.role === "guardian") {
    return !!session.studentRecordId && session.studentRecordId === studentId;
  }
  return false;
}
