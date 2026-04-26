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
  jobTitle: string;
  department: string;
  responsibilities: string | null;
  qualification: string | null;
  yearsOfService: number;
  phone: string | null;
  email: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
};

const COLUMNS: CsvColumn<Row>[] = [
  { header: "الاسم الكامل", accessor: (r) => r.fullName },
  { header: "السجل المدني", accessor: (r) => r.nationalId },
  { header: "المسمى الوظيفي", accessor: (r) => r.jobTitle },
  { header: "القسم", accessor: (r) => r.department },
  { header: "المهام", accessor: (r) => r.responsibilities },
  { header: "المؤهل", accessor: (r) => r.qualification },
  { header: "سنوات الخدمة", accessor: (r) => r.yearsOfService },
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
      fullName: schema.admins.fullName,
      nationalId: schema.admins.nationalId,
      jobTitle: schema.admins.jobTitle,
      department: schema.admins.department,
      responsibilities: schema.admins.responsibilities,
      qualification: schema.admins.qualification,
      yearsOfService: schema.admins.yearsOfService,
      phone: schema.admins.phone,
      email: schema.admins.email,
      status: schema.admins.status,
      notes: schema.admins.notes,
      createdAt: schema.admins.createdAt,
    })
    .from(schema.admins)
    .orderBy(asc(schema.admins.fullName));

  const body = toCsv(rows, COLUMNS);
  return csvResponse(`admins-${dateStamp()}.csv`, body);
}
