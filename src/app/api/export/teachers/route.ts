import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { assertPermission, ForbiddenError } from "@/lib/permissions";
import { csvResponse, dateStamp, toCsv, type CsvColumn } from "@/lib/csv";

export const dynamic = "force-dynamic";

const STATUS_AR: Record<string, string> = {
  active: "على رأس العمل",
  leave: "في إجازة",
  transferred: "منقولة",
  resigned: "مستقيلة",
};

type Row = {
  fullName: string;
  nationalId: string;
  specialty: string;
  subjects: string | null;
  qualification: string | null;
  yearsOfService: number;
  weeklyLoad: number;
  phone: string | null;
  email: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
};

const COLUMNS: CsvColumn<Row>[] = [
  { header: "الاسم الكامل", accessor: (r) => r.fullName },
  { header: "السجل المدني", accessor: (r) => r.nationalId },
  { header: "التخصص", accessor: (r) => r.specialty },
  { header: "المواد", accessor: (r) => r.subjects },
  { header: "المؤهل", accessor: (r) => r.qualification },
  { header: "سنوات الخدمة", accessor: (r) => r.yearsOfService },
  { header: "النصاب الأسبوعي", accessor: (r) => r.weeklyLoad },
  { header: "الهاتف", accessor: (r) => r.phone },
  { header: "البريد", accessor: (r) => r.email },
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
      fullName: schema.teachers.fullName,
      nationalId: schema.teachers.nationalId,
      specialty: schema.teachers.specialty,
      subjects: schema.teachers.subjects,
      qualification: schema.teachers.qualification,
      yearsOfService: schema.teachers.yearsOfService,
      weeklyLoad: schema.teachers.weeklyLoad,
      phone: schema.teachers.phone,
      email: schema.teachers.email,
      status: schema.teachers.status,
      notes: schema.teachers.notes,
      createdAt: schema.teachers.createdAt,
    })
    .from(schema.teachers)
    .orderBy(asc(schema.teachers.fullName));

  const body = toCsv(rows, COLUMNS);
  return csvResponse(`teachers-${dateStamp()}.csv`, body);
}
