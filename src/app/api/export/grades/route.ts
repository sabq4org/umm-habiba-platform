import { and, asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { assertPermission, ForbiddenError } from "@/lib/permissions";
import { csvResponse, dateStamp, toCsv, type CsvColumn } from "@/lib/csv";

export const dynamic = "force-dynamic";

type Row = {
  studentName: string;
  studentNationalId: string;
  grade: string;
  section: string;
  subjectName: string;
  assessmentName: string;
  term: string;
  kind: string;
  maxScore: number;
  weight: number;
  score: number | null;
  percentage: number | null;
  notes: string | null;
};

const COLUMNS: CsvColumn<Row>[] = [
  { header: "الطالبة", accessor: (r) => r.studentName },
  { header: "السجل المدني", accessor: (r) => r.studentNationalId },
  { header: "الصف", accessor: (r) => r.grade },
  { header: "الشعبة", accessor: (r) => r.section },
  { header: "المادة", accessor: (r) => r.subjectName },
  { header: "التقييم", accessor: (r) => r.assessmentName },
  { header: "الفصل", accessor: (r) => r.term },
  { header: "النوع", accessor: (r) => r.kind },
  { header: "الدرجة", accessor: (r) => r.score },
  { header: "العظمى", accessor: (r) => r.maxScore },
  { header: "النسبة %", accessor: (r) => r.percentage },
  { header: "الوزن", accessor: (r) => r.weight },
  { header: "ملاحظات", accessor: (r) => r.notes },
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
  const classId = sp.get("classId");
  const subjectId = sp.get("subjectId");
  const term = sp.get("term");

  const filters = [];
  if (classId) filters.push(eq(schema.assessments.classId, classId));
  if (subjectId) filters.push(eq(schema.assessments.subjectId, subjectId));
  if (term) filters.push(eq(schema.assessments.term, term));

  const baseQuery = db
    .select({
      studentName: schema.students.fullName,
      studentNationalId: schema.students.nationalId,
      grade: schema.students.grade,
      section: schema.students.section,
      subjectName: schema.subjects.name,
      assessmentName: schema.assessments.name,
      term: schema.assessments.term,
      kind: schema.assessments.kind,
      maxScore: schema.assessments.maxScore,
      weight: schema.assessments.weight,
      score: schema.studentGrades.score,
      notes: schema.studentGrades.notes,
    })
    .from(schema.studentGrades)
    .innerJoin(
      schema.assessments,
      eq(schema.studentGrades.assessmentId, schema.assessments.id),
    )
    .innerJoin(
      schema.students,
      eq(schema.studentGrades.studentId, schema.students.id),
    )
    .innerJoin(
      schema.subjects,
      eq(schema.assessments.subjectId, schema.subjects.id),
    )
    .$dynamic();

  const query = filters.length ? baseQuery.where(and(...filters)) : baseQuery;
  const raw = await query.orderBy(
    asc(schema.students.grade),
    asc(schema.students.section),
    asc(schema.students.fullName),
    asc(schema.subjects.name),
    asc(schema.assessments.name),
  );

  const rows: Row[] = raw.map((r) => ({
    ...r,
    percentage:
      r.score === null || r.maxScore === 0
        ? null
        : Math.round((r.score / r.maxScore) * 1000) / 10,
  }));

  const body = toCsv(rows, COLUMNS);
  const parts = [
    classId ? `class-${classId.slice(0, 8)}` : null,
    subjectId ? `subj-${subjectId.slice(0, 8)}` : null,
    term ? term : null,
  ].filter(Boolean);
  const stamp = parts.length ? parts.join("-") : dateStamp();
  return csvResponse(`grades-${stamp}.csv`, body);
}
