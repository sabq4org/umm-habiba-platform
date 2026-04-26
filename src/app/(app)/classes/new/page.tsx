import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { NewClassForm } from "./NewClassForm";

export const dynamic = "force-dynamic";

export default async function NewClassPage() {
  await requirePermission("classes.write");
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
          <p className="eyebrow">إضافة سجل</p>
          <h2 className="page-title">تسجيل فصل جديد</h2>
          <p className="page-subtitle">
            عرّفي شعبة دراسية: الصف، الرمز، العام الدراسي، الغرفة، السعة، ورائدة
            الفصل (اختياري).
          </p>
        </div>

        <Link className="ghost-link" href="/classes">
          <ArrowRight size={16} strokeWidth={2} />
          الرجوع للقائمة
        </Link>
      </header>

      <section className="card form-card">
        <NewClassForm teachers={teachers} />
      </section>
    </>
  );
}
