/**
 * Spreadsheet export, as a CSV that Excel opens correctly.
 *
 * Two details make the difference between a file the studio can use and one that
 * shows "Nguyá»…n" in every name cell:
 *
 *   1. A UTF-8 byte-order mark. Excel on Windows assumes the system code page for
 *      a .csv without one, which mangles every Vietnamese diacritic.
 *   2. Semicolons, not commas. Excel picks its delimiter from the OS list
 *      separator, and on a Vietnamese or European locale that is `;` — a
 *      comma-separated file lands entirely in column A.
 *
 * A real .xlsx would need a library for one report. This is a deliberate trade:
 * the studio gets a file that opens in Excel today, and the button says CSV
 * rather than claiming to be something it is not.
 */

const DELIMITER = ";";
const BOM = "﻿";

/** RFC 4180 quoting, plus the leading-character guard against formula injection. */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // A cell starting with =, +, - or @ is executed as a formula by Excel. Prefixing
  // a tab keeps the text visible and inert — the studio's data is not a program.
  const guarded = /^[=+\-@]/.test(text) ? `\t${text}` : text;
  return /["\n\r;]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const lines = [headers.map(cell).join(DELIMITER)];
  for (const row of rows) lines.push(row.map(cell).join(DELIMITER));
  // CRLF: Excel is the target reader, and it is the line ending it expects.
  return BOM + lines.join("\r\n") + "\r\n";
}

/**
 * Hands the file to the browser. Kept in one place so no screen has to remember
 * to revoke the object URL — a leaked blob URL holds the whole file in memory for
 * the life of the tab.
 */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}
