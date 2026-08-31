/** Trigger a browser download for a Blob (e.g. CSV export from the API). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Filename-safe timestamp like 20260619-143000. */
export function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[-:T]/g, (c) => (c === 'T' ? '-' : ''));
}

/**
 * Export rows the page already holds as a CSV file.
 *
 * ── Why a BOM, and why every field is quoted ──────────────────────────────
 *
 * The approved admin screens put a «تصدير» button on eight queues, and the operator
 * opens the result in Excel. Without a UTF-8 byte-order mark Excel guesses the local
 * codepage and every Arabic name arrives as mojibake — the export looks like it worked
 * and the file is unusable, which is the worst of both.
 *
 * Quoting is unconditional rather than conditional on a comma, because the interesting
 * fields here are free text: a captain's note or a support subject can contain a comma,
 * a newline, or a quote, and a single unescaped one shifts every subsequent column. The
 * doubling of `"` is the RFC 4180 escape.
 *
 * `\r\n` for the same reason — it is what RFC 4180 specifies and what Excel expects.
 */
export function downloadCsv(name: string, headers: string[], rows: (string | number)[][]): void {
  const cell = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const body = [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');

  downloadBlob(new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8' }), `${name}-${stamp()}.csv`);
}
