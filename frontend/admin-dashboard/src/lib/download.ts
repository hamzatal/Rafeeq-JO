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
