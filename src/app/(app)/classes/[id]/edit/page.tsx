import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { EditClassForm } from "./EditClassForm";
import { DeleteClassButton } from "./DeleteClassButton";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("classes.write");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [classRow] = await db
    .select()
    .from(schema.classes)
    .where(eq(schema.classes.id, id))
    .limit(1);

  if (!classRow) notFound();

  const teachers = await db
    .select({
      id: schema.teachers.id,
      fullName: schema.teachers.fullName,
      specialty: schema.teachers.specialty,
    })
    .from(schema.teachers)
    .orderBy(asc(schema.teachers.fullName));

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">تعديل سجل</p>
          <h2 className="page-title">تعديل بيانات الفصل</h2>
          <p className="page-subtitle">
            عدّلي بيانات الفصل حسب الحاجة. التغييرات تُحفظ مباشرة في قاعدة البيانات.
          </p>
        </div>

        <Link className="ghost-link" href={`/classes/${classRow.id}`}>
          <ArrowRight size={16} strokeWidth={2} />
          الرجوع للملف
        </Link>
      </header>

      <section className="card form-card">
        <EditClassForm
          id={classRow.id}
          teachers={teachers}
          values={{
            grade: classRow.grade,
            section: classRow.section,
            academicYear: classRow.academicYear,
            homeroomTeacherId: classRow.homeroomTeacherId ?? "",
            capacity: String(classRow.capacity),
            room: classRow.room ?? "",
            status: classRow.status,
            notes: classRow.notes ?? "",
          }}
        />
      </section>

      <section className="card danger-zone">
        <div className="section-heading">
          <h2>منطقة الإجراءات الحساسة</h2>
        </div>
        <div className="danger-row">
          <div>
            <h3>حذف الفصل</h3>
            <p>
              سيتم حذف بيانات الفصل بشكل نهائي. الطالبات لن يحذفن، ولكن سيفقدن
              الارتباط المنطقي بهذه الشعبة.
            </p>
          </div>
          <DeleteClassButton
            id={classRow.id}
            label={`${classRow.grade} — ${classRow.section}`}
          />
        </div>
      </section>
    </>
  );
}
