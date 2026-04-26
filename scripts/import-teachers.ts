import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

type TeacherRow = {
  fullName: string;
  nationalId: string;
  specialty?: string | null;
  subjects?: string | null;
  qualification?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};

async function run() {
  const { db, schema } = await import("../src/db/index");

  const arg = process.argv[2] ?? "scripts/import-data/teachers.json";
  const jsonPath = arg.startsWith("/") ? arg : resolve(process.cwd(), arg);
  const rows = JSON.parse(readFileSync(jsonPath, "utf-8")) as TeacherRow[];
  console.log(`📂 Loaded ${rows.length} teachers from ${jsonPath}`);

  const existing = await db
    .select({ nationalId: schema.teachers.nationalId })
    .from(schema.teachers);
  const existingIds = new Set(existing.map((t) => t.nationalId));

  const toInsert = rows
    .filter((r) => !existingIds.has(r.nationalId))
    .map((r) => ({
      fullName: r.fullName,
      nationalId: r.nationalId,
      specialty: r.specialty ?? "غير محدد",
      subjects: r.subjects ?? null,
      qualification: r.qualification ?? null,
      phone: r.phone ?? null,
      email: r.email ?? null,
      notes: r.notes ?? null,
    }));

  if (toInsert.length === 0) {
    console.log(`✅ Nothing to insert — all ${rows.length} already exist.`);
    return;
  }

  const CHUNK = 50;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const slice = toInsert.slice(i, i + CHUNK);
    await db.insert(schema.teachers).values(slice);
    inserted += slice.length;
    process.stdout.write(`  inserted ${inserted}/${toInsert.length}\r`);
  }
  process.stdout.write("\n");

  const skipped = rows.length - toInsert.length;
  console.log(
    `✅ Inserted ${inserted} new teacher(s); skipped ${skipped} already existing`,
  );
  console.log(
    `ℹ️  Specialty/subjects/qualification were not in the source file —` +
      ` defaulted specialty to "غير محدد" so the records can be edited later via the UI.`,
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
