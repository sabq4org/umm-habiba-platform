/**
 * Lightweight CSV export utilities.
 *
 * - Generates a UTF-8 CSV with a BOM so Excel opens Arabic text correctly.
 * - Quotes fields that contain commas, quotes, or newlines.
 * - Renders dates/booleans/objects in a predictable, locale-friendly way.
 */

export type CsvCell = string | number | boolean | null | undefined | Date;

export type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => CsvCell;
};

const BOM = "\uFEFF";

function formatCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return String(value);
}

function escapeCell(raw: string): string {
  if (raw.includes("\"") || raw.includes(",") || raw.includes("\n") || raw.includes("\r")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines: string[] = [];
  lines.push(columns.map((c) => escapeCell(c.header)).join(","));
  for (const row of rows) {
    lines.push(
      columns.map((c) => escapeCell(formatCell(c.accessor(row)))).join(","),
    );
  }
  return BOM + lines.join("\r\n");
}

export function csvResponse(
  filename: string,
  body: string,
): Response {
  const safeName = filename.replace(/[\\/]/g, "_");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "Cache-Control": "no-store",
    },
  });
}

/** Format a Date as YYYY-MM-DD in UTC, suitable for filenames. */
export function dateStamp(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
