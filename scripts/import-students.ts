import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

type StudentRow = {
  fullName: string;
  nationalId: string;
  grade: string;
  section: string;
  seq?: number;
};

async function run() {
  const { db, schema } = await import("../src/db/index");

  // Accept the JSON file as a CLI arg; default to grade1 for back-compat.
  const arg = process.argv[2] ?? "scripts/import-data/grade1-students.json";
  const jsonPath = arg.startsWith("/") ? arg : resolve(process.cwd(), arg);
  const rows = JSON.parse(readFileSync(jsonPath, "utf-8")) as StudentRow[];
  console.log(`📂 Loaded ${rows.length} students from ${jsonPath}`);

  // Make sure every (grade, section) referenced by the import exists
  // as a class row, so timetables / attendance / grades pages can
  // render properly. We treat (grade, section, academicYear) as the
  // logical key — see classes.gradeSectionYearUnique.
  const academicYear = "1447هـ";
  const sectionsNeeded = Array.from(new Set(rows.map((r) => r.section))).sort();
  const grade = rows[0]?.grade ?? "الأول متوسط";

  const existingClasses = await db
    .select()
    .from(schema.classes)
    .where(eq(schema.classes.grade, grade));
  const existingSections = new Set(existingClasses.map((c) => c.section));

  const missing = sectionsNeeded.filter((s) => !existingSections.has(s));
  if (missing.length > 0) {
    const wing = (s: string) => {
      const n = Number(s.split("/")[0]);
      return ["A", "B", "C", "D"][n - 1] ?? "A";
    };
    await db.insert(schema.classes).values(
      missing.map((section) => ({
        grade,
        section,
        academicYear,
        capacity: 35,
        room: `${wing(section)}-${section.replace("/", "0")}`,
      })),
    );
    console.log(`🏫 Created ${missing.length} new class section(s): ${missing.join(", ")}`);
  } else {
    console.log(`🏫 All ${sectionsNeeded.length} sections already exist`);
  }

  // Insert students, skipping any whose national_id is already in DB.
  const existing = await db
    .select({ nationalId: schema.students.nationalId })
    .from(schema.students);
  const existingIds = new Set(existing.map((s) => s.nationalId));

  const toInsert = rows
    .filter((r) => !existingIds.has(r.nationalId))
    .map((r) => ({
      fullName: r.fullName,
      nationalId: r.nationalId,
      grade: r.grade,
      section: r.section,
      nationality: "سعودية",
      enrollmentDate: "2026-09-01",
    }));

  if (toInsert.length === 0) {
    console.log(`✅ Nothing to insert — all ${rows.length} already exist.`);
    return;
  }

  // Insert in chunks to keep payload reasonable on the HTTP driver.
  const CHUNK = 50;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const slice = toInsert.slice(i, i + CHUNK);
    await db.insert(schema.students).values(slice);
    inserted += slice.length;
    process.stdout.write(`  inserted ${inserted}/${toInsert.length}\r`);
  }
  process.stdout.write("\n");

  const skipped = rows.length - toInsert.length;
  console.log(
    `✅ Inserted ${inserted} new student(s); skipped ${skipped} already existing`,
  );

  // Per-section tally
  const byGradeSection: Record<string, number> = {};
  for (const r of toInsert) {
    const k = `${r.grade} ${r.section}`;
    byGradeSection[k] = (byGradeSection[k] ?? 0) + 1;
  }
  console.log("📊 Distribution:");
  for (const [k, v] of Object.entries(byGradeSection).sort()) {
    console.log(`    ${k}: ${v}`);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
