import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { assertPermission, ForbiddenError } from "@/lib/permissions";
import { csvResponse, dateStamp, toCsv, type CsvColumn } from "@/lib/csv";

export const dynamic = "force-dynamic";

const STATUS_AR: Record<string, string> = {
  active: "نشطة",
  transferred: "منقولة",
  graduated: "متخرجة",
  suspended: "موقوفة",
};

type Row = {
  fullName: string;
  nationalId: string;
  grade: string;
  section: string;
  phone: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
};

const COLUMNS: CsvColumn<Row>[] = [
  { header: "الاسم الكامل", accessor: (r) => r.fullName },
  { header: "السجل المدني", accessor: (r) => r.nationalId },
  { header: "الصف", accessor: (r) => r.grade },
  { header: "الشعبة", accessor: (r) => r.section },
  { header: "هاتف الطالبة", accessor: (r) => r.phone },
  { header: "ولي الأمر", accessor: (r) => r.guardianName },
  { header: "هاتف ولي الأمر", accessor: (r) => r.guardianPhone },
  { header: "الحالة", accessor: (r) => STATUS_AR[r.status] ?? r.status },
  { header: "ملاحظات", accessor: (r) => r.notes },
  { header: "تاريخ التسجيل", accessor: (r) => r.createdAt },
];

export async function GET(): Promise<Response> {
  try {
    await assertPermission("export.run");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return new Response(err.message, { status: 403 });
    }
    throw err;
  }

  const rows: Row[] = await db
    .select({
      fullName: schema.students.fullName,
      nationalId: schema.students.nationalId,
      grade: schema.students.grade,
      section: schema.students.section,
      phone: schema.students.phone,
      guardianName: schema.students.guardianName,
      guardianPhone: schema.students.guardianPhone,
      status: schema.students.status,
      notes: schema.students.notes,
      createdAt: schema.students.createdAt,
    })
    .from(schema.students)
    .orderBy(
      asc(schema.students.grade),
      asc(schema.students.section),
      asc(schema.students.fullName),
    );

  const body = toCsv(rows, COLUMNS);
  return csvResponse(`students-${dateStamp()}.csv`, body);
}
