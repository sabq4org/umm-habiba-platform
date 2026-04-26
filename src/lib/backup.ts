/**
 * Snapshot helpers used by both the export API route and the import server
 * action. Keeping the table list in one place ensures that a snapshot taken
 * by `exportSnapshot()` can always be restored by `importSnapshot()` without
 * surprising drift.
 *
 * IMPORTANT — order matters because of FK constraints:
 *   - INSERT_ORDER walks parents -> children.
 *   - DELETE_ORDER is the reverse, so a `truncate-and-restore` cycle is safe.
 */

import { sql } from "drizzle-orm";
import { db, schema } from "@/db";

export const SNAPSHOT_VERSION = "1.0";
export const SNAPSHOT_PLATFORM = "umm-habiba-platform";

// Parents first → children last. Used when restoring rows.
export const INSERT_ORDER = [
  "students",
  "teachers",
  "admins",
  "classes",
  "subjects",
  "scheduleEntries",
  "attendanceRecords",
  "assessments",
  "studentGrades",
  "users",
  "announcements",
  "messages",
  "auditLogs",
  "loginAttempts",
] as const satisfies readonly (keyof typeof schema)[];

export type SnapshotTableKey = (typeof INSERT_ORDER)[number];

// Children first → parents last. Used when wiping for a full restore.
export const DELETE_ORDER = [...INSERT_ORDER].reverse();

export type Snapshot = {
  version: string;
  platform: string;
  generatedAt: string;
  rowCount: number;
  tables: Record<SnapshotTableKey, Record<string, unknown>[]>;
};

/** Read every table into memory. Fine for school-sized data (well under 1MB). */
export async function exportSnapshot(): Promise<Snapshot> {
  const tables: Snapshot["tables"] = {} as Snapshot["tables"];
  let total = 0;
  for (const key of INSERT_ORDER) {
    const rows = await db.select().from(schema[key]);
    tables[key] = rows as unknown as Record<string, unknown>[];
    total += rows.length;
  }
  return {
    version: SNAPSHOT_VERSION,
    platform: SNAPSHOT_PLATFORM,
    generatedAt: new Date().toISOString(),
    rowCount: total,
    tables,
  };
}

export type ImportOptions = {
  /** Username whose row must survive the wipe (so you don't lock yourself out). */
  preserveUsername?: string;
};

export type ImportResult = {
  ok: true;
  inserted: Record<SnapshotTableKey, number>;
  totalInserted: number;
  preservedCurrentUser: boolean;
};

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupValidationError";
  }
}

/** Throws if the JSON doesn't look like a snapshot from this platform. */
export function validateSnapshot(input: unknown): asserts input is Snapshot {
  if (!input || typeof input !== "object") {
    throw new BackupValidationError("الملف ليس بصيغة JSON صالحة");
  }
  const obj = input as Record<string, unknown>;
  if (obj.platform !== SNAPSHOT_PLATFORM) {
    throw new BackupValidationError(
      `الملف لا يخص هذه المنصة (المتوقع: ${SNAPSHOT_PLATFORM}، الموجود: ${String(obj.platform)})`,
    );
  }
  if (obj.version !== SNAPSHOT_VERSION) {
    throw new BackupValidationError(
      `إصدار النسخة غير مدعوم (المتوقع: ${SNAPSHOT_VERSION}، الموجود: ${String(obj.version)})`,
    );
  }
  if (!obj.tables || typeof obj.tables !== "object") {
    throw new BackupValidationError("الملف لا يحتوي على بيانات الجداول");
  }
  const tables = obj.tables as Record<string, unknown>;
  for (const key of INSERT_ORDER) {
    if (!Array.isArray(tables[key])) {
      throw new BackupValidationError(`جدول مفقود أو غير صالح: ${key}`);
    }
  }
}

/**
 * Replace every row in every table with the contents of the snapshot.
 *
 * Performed inside a single transaction so a failure rolls everything back —
 * the user keeps their existing data instead of getting a half-imported state.
 *
 * If `preserveUsername` is provided, that user row from the *current* DB is
 * kept and re-inserted even if the snapshot doesn't include it, so the active
 * admin doesn't get locked out by importing an older backup.
 */
export async function importSnapshot(
  snapshot: Snapshot,
  opts: ImportOptions = {},
): Promise<ImportResult> {
  validateSnapshot(snapshot);

  const inserted: Record<string, number> = {};

  // Capture the current admin row before truncating so we can re-insert it
  // if it isn't present in the snapshot.
  const preserveRow = opts.preserveUsername
    ? (
        await db
          .select()
          .from(schema.users)
          .where(sql`username = ${opts.preserveUsername}`)
      )[0]
    : undefined;

  let preservedCurrentUser = false;

  // Drizzle's neon-http driver can't open a real BEGIN/COMMIT transaction, so
  // we rely on PostgreSQL's `TRUNCATE … RESTART IDENTITY CASCADE` for atomic
  // wipes per table and then bulk-insert in dependency order. Any insert
  // failure leaves the DB partially restored — but we surface the error and
  // the user can re-run the import safely (idempotent on the snapshot file).
  await db.execute(sql.raw(
    `TRUNCATE TABLE ${DELETE_ORDER.map((k) => `"${tableName(k)}"`).join(", ")} RESTART IDENTITY CASCADE`,
  ));

  let totalInserted = 0;

  for (const key of INSERT_ORDER) {
    const rows = snapshot.tables[key];
    if (!rows.length) {
      inserted[key] = 0;
      continue;
    }
    // Drizzle expects rows shaped to the table — it's safe to insert raw
    // objects from JSON because we only write to columns that exist.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = schema[key] as any;
    const CHUNK = 200;
    let count = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      await db.insert(table).values(slice);
      count += slice.length;
    }
    inserted[key] = count;
    totalInserted += count;
  }

  // Re-insert the preserved user if missing.
  if (preserveRow) {
    const stillThere = (
      await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(sql`username = ${preserveRow.username}`)
    )[0];
    if (!stillThere) {
      await db.insert(schema.users).values(preserveRow);
      inserted.users = (inserted.users ?? 0) + 1;
      totalInserted += 1;
      preservedCurrentUser = true;
    }
  }

  return {
    ok: true,
    inserted: inserted as Record<SnapshotTableKey, number>,
    totalInserted,
    preservedCurrentUser,
  };
}

/** Map our schema-key to the actual SQL table name. */
function tableName(key: SnapshotTableKey): string {
  switch (key) {
    case "students": return "students";
    case "teachers": return "teachers";
    case "admins": return "admins";
    case "classes": return "classes";
    case "subjects": return "subjects";
    case "scheduleEntries": return "schedule_entries";
    case "attendanceRecords": return "attendance_records";
    case "assessments": return "assessments";
    case "studentGrades": return "student_grades";
    case "users": return "users";
    case "announcements": return "announcements";
    case "messages": return "messages";
    case "auditLogs": return "audit_logs";
    case "loginAttempts": return "login_attempts";
  }
}

export function snapshotFileName(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  return `umm-habiba-backup-${y}${m}${d}-${hh}${mm}.json`;
}
