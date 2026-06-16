/** Jordanian phone normalisation to E.164 (+9627XXXXXXXX). */
export function normalizeJordanPhone(raw: string): string | null {
  let digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return null;

  if (digits.startsWith('00962')) digits = digits.slice(2);

  let local: string;
  if (digits.startsWith('962')) local = digits.slice(3);
  else if (digits.startsWith('0')) local = digits.slice(1);
  else local = digits;

  if (!/^7[789]\d{7}$/.test(local)) return null;

  return `+962${local}`;
}

export function isValidJordanPhone(raw: string): boolean {
  return normalizeJordanPhone(raw) !== null;
}
