import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { EditAdminForm } from "./EditAdminForm";
import { DeleteAdminButton } from "./DeleteAdminButton";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("admins.write");
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    notFound();
  }

  const [admin] = await db
    .select()
    .from(schema.admins)
    .where(eq(schema.admins.id, id))
    .limit(1);

  if (!admin) {
    notFound();
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">تعديل سجل</p>
          <h2 className="page-title">تعديل بيانات الإدارية</h2>
          <p className="page-subtitle">
            عدّلي البيانات حسب الحاجة. التغييرات تُحفظ مباشرة في قاعدة البيانات.
          </p>
        </div>

        <Link className="ghost-link" href={`/admins/${admin.id}`}>
          <ArrowRight size={16} strokeWidth={2} />
          الرجوع للملف
        </Link>
      </header>

      <section className="card form-card">
        <EditAdminForm
          id={admin.id}
          values={{
            fullName: admin.fullName,
            nationalId: admin.nationalId,
            jobTitle: admin.jobTitle,
            department: admin.department,
            responsibilities: admin.responsibilities ?? "",
            qualification: admin.qualification ?? "",
            yearsOfService: String(admin.yearsOfService),
            phone: admin.phone ?? "",
            email: admin.email ?? "",
            status: admin.status,
            notes: admin.notes ?? "",
          }}
        />
      </section>

      <section className="card danger-zone">
        <div className="section-heading">
          <h2>منطقة الإجراءات الحساسة</h2>
        </div>
        <div className="danger-row">
          <div>
            <h3>حذف ملف الإدارية</h3>
            <p>
              سيتم حذف بيانات الإدارية بشكل نهائي من القاعدة. هذا الإجراء لا يمكن
              التراجع عنه.
            </p>
          </div>
          <DeleteAdminButton id={admin.id} name={admin.fullName} />
        </div>
      </section>
    </>
  );
}
