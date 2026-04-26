import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { eq, ne, notInArray, sql } from "drizzle-orm";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

const REAL_STUDENT_FILES = [
  "scripts/import-data/grade1-students.json",
  "scripts/import-data/grade2-students.json",
  "scripts/import-data/grade3-students.json",
];
const REAL_TEACHER_FILE = "scripts/import-data/teachers.json";

const KEEP_ADMIN_EMAIL = "fatima@ummhabiba.edu.sa";
const KEEP_USERNAME = "admin";

async function run() {
  const { db, schema } = await import("../src/db/index");

  const realStudentIds = new Set<string>();
  for (const f of REAL_STUDENT_FILES) {
    const rows = JSON.parse(readFileSync(f, "utf-8")) as { nationalId: string }[];
    rows.forEach((r) => realStudentIds.add(r.nationalId));
  }
  const realTeacherIds = new Set<string>();
  const tRows = JSON.parse(readFileSync(REAL_TEACHER_FILE, "utf-8")) as {
    nationalId: string;
  }[];
  tRows.forEach((r) => realTeacherIds.add(r.nationalId));

  const cnt = async (t: unknown) =>
    Number(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await db.select({ c: sql<number>`count(*)` }).from(t as any))[0]?.c ?? 0,
    );

  console.log("📊 BEFORE:");
  console.log("  students:", await cnt(schema.students));
  console.log("  teachers:", await cnt(schema.teachers));
  console.log("  admins  :", await cnt(schema.admins));
  console.log("  users   :", await cnt(schema.users));

  // 1. Delete operational/transactional data first (respect FKs).
  console.log("\n🗑  Wiping operational data…");
  await db.delete(schema.studentGrades);
  console.log("   ✓ student_grades");
  await db.delete(schema.assessments);
  console.log("   ✓ assessments");
  await db.delete(schema.attendanceRecords);
  console.log("   ✓ attendance_records");
  await db.delete(schema.scheduleEntries);
  console.log("   ✓ schedule_entries");
  await db.delete(schema.announcements);
  console.log("   ✓ announcements");
  await db.delete(schema.messages);
  console.log("   ✓ messages");
  await db.delete(schema.auditLogs);
  console.log("   ✓ audit_logs");
  await db.delete(schema.loginAttempts);
  console.log("   ✓ login_attempts");

  // 2. Delete fake auth users (everyone except `admin`).
  console.log("\n🗑  Removing fake users…");
  const delUsers = await db
    .delete(schema.users)
    .where(ne(schema.users.username, KEEP_USERNAME))
    .returning({ username: schema.users.username });
  console.log(`   ✓ removed ${delUsers.length} user(s):`, delUsers.map((u) => u.username));

  // 3. Delete fake admins (everyone except principal).
  console.log("\n🗑  Removing fake admins…");
  const delAdmins = await db
    .delete(schema.admins)
    .where(ne(schema.admins.email, KEEP_ADMIN_EMAIL))
    .returning({ email: schema.admins.email });
  console.log(`   ✓ removed ${delAdmins.length} admin(s):`, delAdmins.map((a) => a.email));

  // 4. Delete fake teachers (those NOT in the imported teachers JSON).
  console.log("\n🗑  Removing fake teachers…");
  const realT = Array.from(realTeacherIds);
  const delTeachers = realT.length
    ? await db
        .delete(schema.teachers)
        .where(notInArray(schema.teachers.nationalId, realT))
        .returning({ name: schema.teachers.fullName })
    : [];
  console.log(`   ✓ removed ${delTeachers.length} teacher(s):`, delTeachers.map((t) => t.name));

  // 5. Delete fake students (those NOT in any imported students JSON).
  console.log("\n🗑  Removing fake students…");
  const realS = Array.from(realStudentIds);
  const delStudents = realS.length
    ? await db
        .delete(schema.students)
        .where(notInArray(schema.students.nationalId, realS))
        .returning({ name: schema.students.fullName })
    : [];
  console.log(`   ✓ removed ${delStudents.length} student(s):`, delStudents.map((s) => s.name));

  console.log("\n📊 AFTER:");
  console.log("  students       :", await cnt(schema.students));
  console.log("  teachers       :", await cnt(schema.teachers));
  console.log("  admins         :", await cnt(schema.admins));
  console.log("  users          :", await cnt(schema.users));
  console.log("  classes (kept) :", await cnt(schema.classes));
  console.log("  subjects(kept) :", await cnt(schema.subjects));
  console.log("  announcements  :", await cnt(schema.announcements));
  console.log("  assessments    :", await cnt(schema.assessments));
  console.log("  studentGrades  :", await cnt(schema.studentGrades));
  console.log("  scheduleEntries:", await cnt(schema.scheduleEntries));
  console.log("  attendanceRec. :", await cnt(schema.attendanceRecords));
  console.log("  auditLogs      :", await cnt(schema.auditLogs));
  console.log("  loginAttempts  :", await cnt(schema.loginAttempts));

  // Sanity check: admin user is still there
  const remainingAdmin = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, KEEP_USERNAME));
  if (remainingAdmin.length === 0) {
    throw new Error("⚠  admin user is gone — aborting (data is in inconsistent state)");
  }
  console.log("\n✅ Done. Login still works as username:", KEEP_USERNAME);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
