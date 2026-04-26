import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { assertPermission, ForbiddenError } from "@/lib/permissions";
import { csvResponse, dateStamp, toCsv, type CsvColumn } from "@/lib/csv";

export const dynamic = "force-dynamic";

const STATUS_AR: Record<string, string> = {
  present: "حاضرة",
  absent: "غائبة",
  late: "متأخرة",
  excused: "بعذر",
};

type Row = {
  attendanceDate: string;
  studentName: string;
  studentNationalId: string;
  grade: string;
  section: string;
  subjectName: string;
  period: number;
  teacherName: string | null;
  status: string;
  notes: string | null;
  recordedBy: string | null;
};

const COLUMNS: CsvColumn<Row>[] = [
  { header: "التاريخ", accessor: (r) => r.attendanceDate },
  { header: "الطالبة", accessor: (r) => r.studentName },
  { header: "السجل المدني", accessor: (r) => r.studentNationalId },
  { header: "الصف", accessor: (r) => r.grade },
  { header: "الشعبة", accessor: (r) => r.section },
  { header: "المادة", accessor: (r) => r.subjectName },
  { header: "الحصة", accessor: (r) => r.period },
  { header: "المعلمة", accessor: (r) => r.teacherName },
  { header: "الحالة", accessor: (r) => STATUS_AR[r.status] ?? r.status },
  { header: "ملاحظات", accessor: (r) => r.notes },
  { header: "المُدخلة", accessor: (r) => r.recordedBy },
];

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await assertPermission("export.run");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return new Response(err.message, { status: 403 });
    }
    throw err;
  }

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const classId = sp.get("classId");

  const filters = [];
  if (from) filters.push(gte(schema.attendanceRecords.attendanceDate, from));
  if (to) filters.push(lte(schema.attendanceRecords.attendanceDate, to));
  if (classId) filters.push(eq(schema.scheduleEntries.classId, classId));

  const baseQuery = db
    .select({
      attendanceDate: schema.attendanceRecords.attendanceDate,
      studentName: schema.students.fullName,
      studentNationalId: schema.students.nationalId,
      grade: schema.students.grade,
      section: schema.students.section,
      subjectName: schema.subjects.name,
      period: schema.scheduleEntries.period,
      teacherName: schema.teachers.fullName,
      status: schema.attendanceRecords.status,
      notes: schema.attendanceRecords.notes,
      recordedBy: schema.attendanceRecords.recordedBy,
    })
    .from(schema.attendanceRecords)
    .innerJoin(
      schema.students,
      eq(schema.attendanceRecords.studentId, schema.students.id),
    )
    .innerJoin(
      schema.scheduleEntries,
      eq(schema.attendanceRecords.scheduleEntryId, schema.scheduleEntries.id),
    )
    .innerJoin(
      schema.subjects,
      eq(schema.scheduleEntries.subjectId, schema.subjects.id),
    )
    .leftJoin(
      schema.teachers,
      eq(schema.scheduleEntries.teacherId, schema.teachers.id),
    )
    .$dynamic();

  const query = filters.length
    ? baseQuery.where(and(...filters))
    : baseQuery;

  const rows: Row[] = await query.orderBy(
    desc(schema.attendanceRecords.attendanceDate),
    asc(schema.students.fullName),
  );

  const body = toCsv(rows, COLUMNS);
  const stamp = from && to ? `${from}_${to}` : dateStamp();
  return csvResponse(`attendance-${stamp}.csv`, body);
}
