/**
 * Exports every table in the platform database to a `database-export/` folder
 * inside the project root, in three complementary formats so you can pick the
 * one most useful for the task at hand:
 *
 *   - `database-export/tables/<table>.json` — array of rows, easy to diff or
 *     load programmatically.
 *   - `database-export/tables/<table>.csv`  — UTF-8 with a BOM so Excel /
 *     Numbers open Arabic correctly out of the box.
 *   - `database-export/tables/<table>.sql`  — `INSERT` statements you can
 *     replay against another Postgres instance.
 *
 * The script also emits:
 *   - `schema.sql`           — Postgres DDL captured via `pg_dump --schema-only`
 *     when the binary version matches the server, otherwise rebuilt from
 *     `information_schema` as a best-effort fallback.
 *   - `full-dump.sql`        — `pg_dump` of schema + data (skipped silently if
 *     pg_dump is unavailable or version-mismatched).
 *   - `manifest.json`        — row counts, file sizes, generated-at timestamp.
 *
 * SECURITY: the export contains every row, including `users.password_hash`
 * and IP addresses in `login_attempts`. The folder is gitignored by default
 * so you don't accidentally push sensitive data to GitHub.
 */

import { config as loadEnv } from "dotenv";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { setDefaultResultOrder } from "node:dns";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "database-export");
const TABLES_DIR = join(OUT_DIR, "tables");

try {
  setDefaultResultOrder("ipv4first");
} catch {
  // Edge runtimes don't expose dns; safe to ignore.
}

/* ---------- CSV helpers (mirror src/lib/csv.ts but standalone) ---------- */

const BOM = "\uFEFF";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return BOM;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  return BOM + lines.join("\r\n");
}

/* ---------- SQL INSERT helpers ---------- */

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function rowsToInsertSql(table: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return `-- table "${table}" is empty\n`;
  }
  const columns = Object.keys(rows[0]);
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const values = rows.map(
    (row) => `(${columns.map((c) => sqlLiteral(row[c])).join(", ")})`,
  );
  return [
    `-- ${rows.length} row(s) for "${table}"`,
    `INSERT INTO "${table}" (${colList}) VALUES`,
    values.join(",\n"),
    ";",
    "",
  ].join("\n");
}

/* ---------- Schema fallback (when pg_dump is unavailable) ---------- */

// neon() resolves to NeonQueryFunction<false, false> (its default generics).
// Spelling that out explicitly keeps strict mode happy when the function is
// passed across module boundaries.
type Sql = NeonQueryFunction<false, false>;

async function buildSchemaFallback(sql: Sql): Promise<string> {
  const tables = (await sql/* sql */ `
    SELECT tablename FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `) as Array<{ tablename: string }>;

  const out: string[] = [
    "-- Best-effort schema rebuilt from information_schema + pg_catalog.",
    "-- Use this when pg_dump's version doesn't match the Postgres server.",
    "-- The canonical source remains src/db/schema.ts.",
    "",
  ];

  const fkStatements: string[] = [];

  for (const { tablename } of tables) {
    const cols = (await sql/* sql */ `
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tablename}
      ORDER BY ordinal_position
    `) as Array<{
      column_name: string;
      data_type: string;
      character_maximum_length: number | null;
      is_nullable: "YES" | "NO";
      column_default: string | null;
    }>;

    // Primary key columns (in order)
    const pk = (await sql/* sql */ `
      SELECT a.attname AS column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
      JOIN pg_class c ON c.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = ${tablename} AND i.indisprimary
      ORDER BY array_position(i.indkey, a.attnum)
    `) as Array<{ column_name: string }>;

    // Unique indexes (excluding the primary key). neon-http returns Postgres
    // arrays as strings like `{col1,col2}`, so we get the columns row-by-row
    // and group them in JS to keep things portable.
    const uniqueRows = (await sql/* sql */ `
      SELECT
        c2.relname AS index_name,
        a.attname AS column_name,
        array_position(i.indkey, a.attnum) AS position
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indrelid
      JOIN pg_class c2 ON c2.oid = i.indexrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
      WHERE n.nspname = 'public' AND c.relname = ${tablename}
        AND i.indisunique AND NOT i.indisprimary
      ORDER BY c2.relname, position
    `) as Array<{ index_name: string; column_name: string; position: number }>;
    const uniques = new Map<string, string[]>();
    for (const r of uniqueRows) {
      const list = uniques.get(r.index_name) ?? [];
      list.push(r.column_name);
      uniques.set(r.index_name, list);
    }

    // Foreign keys (emitted as ALTER TABLE after all tables are created)
    const fks = (await sql/* sql */ `
      SELECT
        tc.constraint_name,
        kcu.column_name AS source_col,
        ccu.table_name  AS target_table,
        ccu.column_name AS target_col,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = tc.constraint_name
       AND kcu.constraint_schema = tc.constraint_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
       AND rc.constraint_schema = tc.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = ${tablename}
      ORDER BY tc.constraint_name
    `) as Array<{
      constraint_name: string;
      source_col: string;
      target_table: string;
      target_col: string;
      update_rule: string;
      delete_rule: string;
    }>;

    const colLines = cols.map((c) => {
      const type =
        c.data_type === "character varying" && c.character_maximum_length
          ? `varchar(${c.character_maximum_length})`
          : c.data_type === "timestamp with time zone"
            ? "timestamptz"
            : c.data_type === "USER-DEFINED"
              ? "text"
              : c.data_type;
      const parts = [`  "${c.column_name}" ${type}`];
      if (c.column_default) parts.push(`DEFAULT ${c.column_default}`);
      if (c.is_nullable === "NO") parts.push("NOT NULL");
      return parts.join(" ");
    });

    const tableLines = [...colLines];
    if (pk.length > 0) {
      tableLines.push(
        `  CONSTRAINT "${tablename}_pkey" PRIMARY KEY (${pk
          .map((p) => `"${p.column_name}"`)
          .join(", ")})`,
      );
    }
    for (const [indexName, cols] of uniques) {
      tableLines.push(
        `  CONSTRAINT "${indexName}" UNIQUE (${cols
          .map((c) => `"${c}"`)
          .join(", ")})`,
      );
    }

    out.push(`CREATE TABLE "${tablename}" (`);
    out.push(tableLines.join(",\n"));
    out.push(");");
    out.push("");

    for (const fk of fks) {
      fkStatements.push(
        `ALTER TABLE "${tablename}" ADD CONSTRAINT "${fk.constraint_name}" ` +
          `FOREIGN KEY ("${fk.source_col}") REFERENCES "${fk.target_table}" ("${fk.target_col}") ` +
          `ON UPDATE ${fk.update_rule} ON DELETE ${fk.delete_rule};`,
      );
    }
  }

  if (fkStatements.length > 0) {
    out.push("-- Foreign keys");
    out.push(...fkStatements);
    out.push("");
  }
  return out.join("\n");
}

/* ---------- Main ---------- */

async function ensureDirs(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(TABLES_DIR, { recursive: true });
}

type DumpOutcome = { ok: boolean; reason?: string };

async function tryPgDump(
  databaseUrl: string,
): Promise<{ schema: DumpOutcome; full: DumpOutcome }> {
  const result = { schema: { ok: false }, full: { ok: false } } as {
    schema: DumpOutcome;
    full: DumpOutcome;
  };

  try {
    const { stdout } = await execFileAsync(
      "pg_dump",
      [
        "--schema-only",
        "--no-owner",
        "--no-privileges",
        "--no-comments",
        databaseUrl,
      ],
      { maxBuffer: 64 * 1024 * 1024 },
    );
    await writeFile(join(OUT_DIR, "schema.sql"), stdout, "utf8");
    result.schema = { ok: true };
  } catch (error) {
    result.schema = {
      ok: false,
      reason: error instanceof Error ? error.message.split("\n")[0] : String(error),
    };
  }

  try {
    const { stdout } = await execFileAsync(
      "pg_dump",
      ["--no-owner", "--no-privileges", databaseUrl],
      { maxBuffer: 256 * 1024 * 1024 },
    );
    await writeFile(join(OUT_DIR, "full-dump.sql"), stdout, "utf8");
    result.full = { ok: true };
  } catch (error) {
    result.full = {
      ok: false,
      reason: error instanceof Error ? error.message.split("\n")[0] : String(error),
    };
  }

  return result;
}

async function fileSize(path: string): Promise<number> {
  try {
    const s = await stat(path);
    return s.size;
  } catch {
    return 0;
  }
}

async function run(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL غير معرّف. أضيفي القيمة في .env.local قبل تشغيل التصدير.",
    );
  }

  await ensureDirs();

  const sql = neon(databaseUrl);

  const tablesRaw = (await sql/* sql */ `
    SELECT tablename FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `) as Array<{ tablename: string }>;
  const tables = tablesRaw.map((t) => t.tablename);
  console.log(`عدد الجداول: ${tables.length}`);

  const dump = await tryPgDump(databaseUrl);

  if (!dump.schema.ok) {
    console.warn(`pg_dump --schema-only فشل: ${dump.schema.reason}`);
    console.log("استخدام بديل من information_schema...");
    const fallback = await buildSchemaFallback(sql);
    await writeFile(join(OUT_DIR, "schema.sql"), fallback, "utf8");
  }
  if (!dump.full.ok) {
    console.warn(
      `pg_dump الكامل فشل (سيتم تخطي full-dump.sql): ${dump.full.reason}`,
    );
  }

  type TableInfo = {
    table: string;
    rows: number;
    json: number;
    csv: number;
    sql: number;
  };
  const manifest: {
    generatedAt: string;
    schemaSqlBytes: number;
    fullDumpBytes: number;
    pgDumpUsed: boolean;
    tables: TableInfo[];
  } = {
    generatedAt: new Date().toISOString(),
    schemaSqlBytes: await fileSize(join(OUT_DIR, "schema.sql")),
    fullDumpBytes: dump.full.ok
      ? await fileSize(join(OUT_DIR, "full-dump.sql"))
      : 0,
    pgDumpUsed: dump.schema.ok || dump.full.ok,
    tables: [],
  };

  for (const table of tables) {
    // `sql.query` accepts a parameterised raw SQL string, so we double-quote
    // the identifier ourselves and pass no parameters.
    const rows = (await sql.query(
      `SELECT * FROM "public"."${table.replace(/"/g, '""')}"`,
    )) as Array<Record<string, unknown>>;

    const jsonPath = join(TABLES_DIR, `${table}.json`);
    const csvPath = join(TABLES_DIR, `${table}.csv`);
    const sqlPath = join(TABLES_DIR, `${table}.sql`);

    await writeFile(jsonPath, JSON.stringify(rows, null, 2), "utf8");
    await writeFile(csvPath, rowsToCsv(rows), "utf8");
    await writeFile(sqlPath, rowsToInsertSql(table, rows), "utf8");

    manifest.tables.push({
      table,
      rows: rows.length,
      json: await fileSize(jsonPath),
      csv: await fileSize(csvPath),
      sql: await fileSize(sqlPath),
    });

    console.log(`  ✓ ${table}: ${rows.length} صف`);
  }

  await writeFile(
    join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  await writeFile(
    join(OUT_DIR, "README.md"),
    [
      "# نسخة قاعدة البيانات",
      "",
      "تم توليد هذا المجلد تلقائيا بواسطة `npm run db:export`.",
      "",
      `- تاريخ التوليد: \`${manifest.generatedAt}\``,
      `- عدد الجداول: ${manifest.tables.length}`,
      `- استخدام pg_dump: ${manifest.pgDumpUsed ? "نعم" : "لا (تم استخدام البديل)"}`,
      "",
      "## الملفات",
      "",
      "| الملف | الوصف |",
      "|------|--------|",
      "| `schema.sql` | تعريفات `CREATE TABLE` (من pg_dump أو بديل من information_schema). |",
      "| `full-dump.sql` | نسخة كاملة (سكيما + بيانات) قابلة للاستعادة بـ `psql`. |",
      "| `tables/<name>.json` | بيانات الجدول كـ JSON. |",
      "| `tables/<name>.csv` | بيانات الجدول كـ CSV (UTF-8 مع BOM للـ Excel). |",
      "| `tables/<name>.sql` | جمل `INSERT` لإعادة إدخال البيانات في قاعدة أخرى. |",
      "| `manifest.json` | فهرس بأحجام الملفات وعدد الصفوف. |",
      "",
      "## الاستعادة",
      "",
      "```bash",
      "# استعادة كاملة (سكيما + بيانات):",
      "psql \"$DATABASE_URL\" < database-export/full-dump.sql",
      "",
      "# سكيما فقط:",
      "psql \"$DATABASE_URL\" < database-export/schema.sql",
      "",
      "# جدول بعينه:",
      "psql \"$DATABASE_URL\" < database-export/tables/students.sql",
      "```",
      "",
      "## تنبيه أمني",
      "",
      "الملفات تحتوي على بيانات حقيقية بما فيها:",
      "",
      "- `users.password_hash` (كلمات مرور مهشّرة بـ scrypt)",
      "- `login_attempts` (عناوين IP وUser-Agent)",
      "- بيانات الطالبات والمعلمات والإداريات الكاملة",
      "",
      "لذلك المجلد كاملاً مضاف إلى `.gitignore` ولن يُرفع إلى GitHub. لا ترفعيه",
      "إلى مكان عام، وعند مشاركته خارج المنصّة احرصي على إزالة الأعمدة الحساسة.",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log("");
  console.log(`تم التصدير في: ${OUT_DIR}`);
  console.log(
    `   - ${manifest.tables.length} جدول × 3 صيغ (JSON / CSV / SQL)`,
  );
  if (manifest.pgDumpUsed) {
    console.log(`   - schema.sql${dump.full.ok ? " + full-dump.sql" : ""} عبر pg_dump`);
  } else {
    console.log(`   - schema.sql عبر information_schema (pg_dump غير متوفر/غير متطابق)`);
  }
  console.log(`   - manifest.json + README.md`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("فشل التصدير:", error);
    process.exit(1);
  });
