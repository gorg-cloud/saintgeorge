/**
 * Excel sheet-name rules.
 *
 * A group is named after its Khodam, so names are human and can be long or
 * contain punctuation — neither of which Excel accepts. Sheet names are capped
 * at 31 characters and may not contain : \ / ? * [ ].
 */

const ILLEGAL = /[:\\/?*[\]]/g;
const MAX_LENGTH = 31;

/**
 * Builds an attachment header that survives non-Latin filenames.
 *
 * HTTP headers are latin-1 only, so an Arabic Khodam name cannot go in
 * `filename=` directly. Browsers that understand RFC 5987 use `filename*` and
 * show the real name; the rest fall back to a stripped ASCII version.
 */
export function attachmentHeader(filename: string): string {
  const asciiFallback =
    filename
      // eslint-disable-next-line no-control-regex
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/["\\]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "download.xlsx";

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export function sheetName(raw: string, suffix = ""): string {
  const cleaned = `${raw}${suffix}`.replace(ILLEGAL, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, MAX_LENGTH) || "Sheet";
}

/**
 * Makes a name unique within a workbook: two long Khodam names can easily share
 * their first 31 characters once truncated.
 */
export function uniqueSheetName(raw: string, taken: Set<string>, suffix = ""): string {
  const base = sheetName(raw, suffix);
  let candidate = base;
  let counter = 2;
  while (taken.has(candidate)) {
    const marker = ` (${counter})`;
    candidate = `${base.slice(0, MAX_LENGTH - marker.length)}${marker}`;
    counter++;
  }
  taken.add(candidate);
  return candidate;
}
